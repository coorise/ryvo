#!/usr/bin/env python3
"""Move auth-hooks domain routes to owning services + scaffold modular layout."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / "auth-hooks" / "src" / "api"
AUTH_SCHEMAS = ROOT / "auth-hooks" / "src" / "schemas" / "validators.ts"

MOVES: dict[str, list[str]] = {
    "cron-jobs": ["admin-tasks"],
    "notification-service": ["admin-messages", "admin-email-templates", "settings-notifications"],
    "support-service": ["admin-feedbacks"],
    "profile-service": ["me", "admin-users", "settings-platform"],
    "trip-lifecycle": ["admin-trips"],
    "kyc-service": ["admin-drivers"],
    "coupon-service": ["admin-finance-coupons"],
    "payout-service": [
        "admin-finance-referrals",
        "admin-finance-tariffs",
        "admin-finance-paychecks",
        "admin-finance-subscriptions",
        "admin-finance-checkouts",
    ],
    "payment-gateway": ["admin-payments", "settings-payment"],
    "audit-service": ["admin-analytics", "admin-dashboard"],
    "routing-engine": ["admin-map"],
}

AUTH_KEEP = ["health", "auth", "internal", "admin-rbac"]


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write_text(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def fix_route_imports(content: str) -> str:
    return content.replace('from "../route-deps.ts"', 'from "../deps.ts"')


def split_settings_routes() -> None:
    text = read_text(AUTH / "settings" / "route.ts")
    header = []
    for line in text.splitlines():
        if line.startswith("export const routes"):
            break
        header.append(line.replace("../route-deps.ts", "../deps.ts"))

    body = text.split("export const routes: RouteDef[] = [", 1)[1]
    body = body.rsplit("];", 1)[0]
    chunks = re.split(r"\n(?=\{\n    method:)", "\n" + body.strip())
    chunks = [c.strip() for c in chunks if c.strip() and "method:" in c]

    platform, payment, notifications = [], [], []
    for c in chunks:
        if "notifications" in c:
            notifications.append(c)
        elif "/payment" in c:
            payment.append(c)
        else:
            platform.append(c)

    for service, folder, parts in [
        ("profile-service", "settings-platform", platform),
        ("payment-gateway", "settings-payment", payment),
        ("notification-service", "settings-notifications", notifications),
    ]:
        dest = ROOT / service / "src" / "api" / folder
        write_text(
            dest / "route.ts",
            "\n".join(header) + f"\nexport const routes: RouteDef[] = [\n" + ",\n".join(parts) + "\n];\n",
        )
        write_text(dest / "index.ts", 'export { routes } from "./route.ts";\n')


def copy_module(service: str, folder: str) -> None:
    src_route = AUTH / folder / "route.ts"
    dest_dir = ROOT / service / "src" / "api" / folder
    write_text(dest_dir / "route.ts", fix_route_imports(read_text(src_route)))
    write_text(dest_dir / "index.ts", 'export { routes } from "./route.ts";\n')


def ensure_health(service: str) -> None:
    health = ROOT / service / "src" / "api" / "health" / "route.ts"
    if health.exists():
        return
    write_text(
        health,
        f'import type {{ RouteDef }} from "../../../_shared/core/router.ts";\n'
        f'import {{ ok }} from "../../../_shared/core/response.ts";\n\n'
        f'export const routes: RouteDef[] = [\n'
        f'  {{\n    method: "GET",\n    path: "/v1/health",\n'
        f'    handler: async () => ok({{ status: "ok", service: "{service}" }}),\n  }},\n];\n',
    )
    write_text(ROOT / service / "src" / "api" / "health" / "index.ts", 'export { routes } from "./route.ts";\n')


def build_deps_for_service(service: str, api_dir: Path) -> None:
    tokens: set[str] = set()
    for route_file in api_dir.rglob("route.ts"):
        text = read_text(route_file)
        m = re.search(r"import \{([^}]+)\} from \"\.\./deps\.ts\"", text, re.S)
        if m:
            for part in m.group(1).split(","):
                name = part.strip().split(" as ")[0].strip()
                if name:
                    tokens.add(name)

    auth_deps = read_text(AUTH / "route-deps.ts")
    out = [
        "// Re-exports used by this service route modules.",
        'export { z } from "zod";',
    ]
    schema_tokens = {
        "couponAdminSchema",
        "preferencesSchema",
        "selfProfileSchema",
        "paymentSettingsSchema",
        "notificationEventSchema",
        "tariffPackageSchema",
        "emailOnlySchema",
        "verifyOtpSchema",
        "resetPasswordSchema",
        "assignRoleSchema",
        "createRoleSchema",
        "updateRoleSchema",
        "createUserSchema",
        "createDriverSchema",
        "docReviewSchema",
        "authLike",
        "canManageMail",
        "canEditMail",
    }
    if tokens & schema_tokens:
        schemas = ROOT / service / "src" / "schemas"
        schemas.mkdir(parents=True, exist_ok=True)
        shutil.copy2(AUTH_SCHEMAS, schemas / "validators.ts")
        out.append('export * from "../schemas/validators.ts";')

    for line in auth_deps.splitlines():
        if not line.startswith("export {"):
            continue
        m = re.match(r"export \{ ([^}]+) \} from \"([^\"]+)\";", line)
        if not m:
            continue
        for n in m.group(1).split(","):
            n = n.strip()
            if n in tokens:
                out.append(f'export {{ {n} }} from "{m.group(2)}";')

    write_text(api_dir / "deps.ts", "\n".join(out) + "\n")


def build_routes_ts(service: str, modules: list[str]) -> None:
    api = ROOT / service / "src" / "api"
    ensure_health(service)
    all_modules = ["health"] + [m for m in modules if m != "health"]
    imports = [
        'import type { RouteDef } from "../../../_shared/core/router.ts";',
        'import { createServiceRouter } from "../../../_shared/core/router.ts";',
    ]
    spreads = []
    for folder in all_modules:
        var = re.sub(r"[^a-zA-Z0-9_]", "_", folder)
        imports.append(f'import {{ routes as {var}_routes }} from "./{folder}/route.ts";')
        spreads.append(f"  ...{var}_routes,")

    write_text(
        api / "routes.ts",
        "\n".join(imports)
        + "\n\nconst allRoutes: RouteDef[] = [\n"
        + "\n".join(spreads)
        + "\n];\n\n"
        + f'export const handle = createServiceRouter("{service}", allRoutes);\n',
    )
    write_text(api / "index.ts", 'export { handle } from "./routes.ts";\n')


def scaffold_service_meta(service: str) -> None:
    svc = ROOT / service
    src = svc / "src"
    configs = src / "configs"
    configs.mkdir(parents=True, exist_ok=True)
    if not (configs / "const.ts").exists():
        write_text(configs / "const.ts", f'export const SERVICE_NAME = "{service}" as const;\n')
    if not (configs / "env.ts").exists():
        write_text(
            configs / "env.ts",
            'import { env as sharedEnv } from "../../../_shared/lib/env.ts";\nexport const env = sharedEnv;\n',
        )
    if not (configs / "index.ts").exists():
        write_text(configs / "index.ts", 'export * from "./const.ts";\nexport * from "./env.ts";\n')
    write_text(
        src / "handler.ts",
        f'/** Gateway entry for {service}. */\nexport {{ handle }} from "./api/routes.ts";\n',
    )
    root_index = svc / "index.ts"
    write_text(
        root_index,
        f'import {{ handle }} from "./src/api/routes.ts";\n'
        f'import {{ env }} from "./src/configs/index.ts";\n\n'
        f"if (import.meta.main) {{\n"
        f'  Bun.serve({{ port: env.port, fetch: handle }});\n'
        f"}}\n",
    )


def rebuild_auth_hooks() -> None:
    for folder in list(AUTH.iterdir()):
        if folder.is_dir() and folder.name not in AUTH_KEEP:
            shutil.rmtree(folder, ignore_errors=True)
    build_deps_for_service("auth-hooks", AUTH)
    build_routes_ts("auth-hooks", AUTH_KEEP)
    scaffold_service_meta("auth-hooks")


def scaffold_monolith(service: str) -> None:
    """Convert legacy single handler.ts into api/legacy/route.ts."""
    handler = ROOT / service / "src" / "handler.ts"
    if not handler.exists():
        return
    text = read_text(handler)
    if 'from "./api/routes.ts"' in text:
        return
    m = re.search(r"createServiceRouter\([^,]+,\s*\[", text)
    if not m:
        return
    start = m.end()
    depth = 1
    i = start
    while i < len(text) and depth:
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
        i += 1
    routes_body = text[m.start() : i].split("[", 1)[1].rsplit("]", 1)[0]
    legacy = ROOT / service / "src" / "api" / "legacy"
    write_text(
        legacy / "route.ts",
        'import type { RouteDef } from "../../../_shared/core/router.ts";\n'
        + text[: text.find("export const handle")]
        + f"export const routes: RouteDef[] = [{routes_body}];\n",
    )
    write_text(legacy / "index.ts", 'export { routes } from "./route.ts";\n')
    build_deps_for_service(service, ROOT / service / "src" / "api")
    build_routes_ts(service, ["legacy"])
    scaffold_service_meta(service)


def preserve_inline_routes(service: str) -> list[str]:
    """If handler.ts still defines routes inline, move them to api/core/route.ts."""
    handler = ROOT / service / "src" / "handler.ts"
    if not handler.exists():
        return []
    text = read_text(handler)
    if 'from "./api/routes.ts"' in text:
        return []
    m = re.search(r"export const handle = createServiceRouter\(\s*\"[^\"]+\",\s*\[", text)
    if not m:
        return []
    start = m.end()
    depth = 1
    i = start
    while i < len(text) and depth:
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
        i += 1
    routes_body = text[start : i - 1].strip()
    imports = text[: m.start()]
    imports = re.sub(
        r"export const handle = createServiceRouter[\s\S]*$",
        "",
        imports,
        count=1,
    ).strip()
    imports = imports.replace("../../_shared/", "../../../_shared/")
    core = ROOT / service / "src" / "api" / "core"
    write_text(
        core / "route.ts",
        imports
        + "\nimport type { RouteDef } from \"../../../_shared/core/router.ts\";\n\n"
        + f"export const routes: RouteDef[] = [{routes_body}];\n",
    )
    write_text(core / "index.ts", 'export { routes } from "./route.ts";\n')
    return ["core"]


def main() -> None:
    split_settings_routes()
    for service, folders in MOVES.items():
        extra = preserve_inline_routes(service)
        modules = extra + list(folders)
        for folder in folders:
            if (AUTH / folder / "route.ts").exists():
                copy_module(service, folder)
            elif folder.startswith("settings-"):
                pass
            else:
                print("skip missing", folder)
        scaffold_service_meta(service)
        build_deps_for_service(service, ROOT / service / "src" / "api")
        build_routes_ts(service, modules)

    rebuild_auth_hooks()

    for svc in ROOT.iterdir():
        if svc.is_dir() and (svc / "src" / "handler.ts").exists() and svc.name not in ("_shared", "ryvo-gateway", "main", "auth-hooks"):
            if svc.name not in MOVES:
                scaffold_monolith(svc.name)

    print("Done. auth-hooks keeps:", AUTH_KEEP)


if __name__ == "__main__":
    main()
