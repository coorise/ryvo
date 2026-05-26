#!/usr/bin/env python3
"""
Ensure every edge function matches docs/project/draft-instructions.txt layout:
  src/api/<name>/{controller,service,validator,route,index}.ts
  src/configs/, src/core/server/, src/core/common/, src/lib/bun/, src/services/, src/types/, src/index.ts
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"_shared", "ryvo-gateway", "main", "node_modules", "scripts"}

SERVICES = [
    "auth-hooks",
    "location-ingest",
    "trip-lifecycle",
    "matching-engine",
    "routing-engine",
    "payment-gateway",
    "payout-service",
    "notification-service",
    "storage-service",
    "kyc-service",
    "coupon-service",
    "support-service",
    "audit-service",
    "geofence-service",
    "shift-service",
    "cron-jobs",
    "gdpr-service",
    "trip-chat",
    "profile-service",
]


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        text = path.read_text(encoding="utf-8")
        if text.strip() == content.strip():
            return
    path.write_text(content, encoding="utf-8")


def service_skeleton(svc: str) -> None:
    base = ROOT / svc / "src"
    write(
        base / "configs" / "const.ts",
        f'export const SERVICE_NAME = "{svc}" as const;\n',
    )
    write(
        base / "configs" / "env.ts",
        'import { env as sharedEnv } from "../../../_shared/lib/env.ts";\n'
        "export const env = sharedEnv;\n",
    )
    write(
        base / "configs" / "index.ts",
        'export * from "./const.ts";\nexport * from "./env.ts";\n',
    )
    write(
        base / "core" / "common" / "index.ts",
        'export { ok, fail } from "../../../../_shared/core/response.ts";\n'
        'export type { RouteDef, RouteHandler } from "../../../../_shared/core/router.ts";\n',
    )
    write(
        base / "core" / "server" / "bootstrap.ts",
        'import { env } from "../../configs/index.ts";\n'
        'import { handle } from "../../api/routes.ts";\n\n'
        "export function startServer() {\n"
        "  const server = Bun.serve({ port: env.port, fetch: handle });\n"
        f'  console.log(`[{svc}] listening on :${{server.port}}`);\n'
        "  return server;\n"
        "}\n",
    )
    write(
        base / "lib" / "bun" / "index.ts",
        'export { createBunServer } from "../../../../_shared/lib/bun/server.ts";\n',
    )
    write(
        base / "services" / "index.ts",
        "/** External service clients (Stripe, Kafka, etc.) — wire per domain module service.ts */\n",
    )
    write(
        base / "types" / "index.ts",
        'export type { RouteDef, RouteHandler } from "../../../_shared/core/router.ts";\n',
    )
    write(
        base / "index.ts",
        'export { handle } from "./api/routes.ts";\n'
        'export { startServer } from "./core/server/bootstrap.ts";\n'
        'export { SERVICE_NAME } from "./configs/const.ts";\n\n'
        'if (import.meta.main) {\n  startServer();\n}\n',
    )
    write(
        ROOT / svc / "src" / "handler.ts",
        f'/** Kong / ryvo-gateway entry */\nexport {{ handle }} from "./api/routes.ts";\n',
    )
    write(
        ROOT / svc / "index.ts",
        'import "./src/index.ts";\n'
        'import { startServer } from "./src/core/server/bootstrap.ts";\n\n'
        "if (import.meta.main) {\n  startServer();\n}\n",
    )


def fn_name(method: str, path: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", path.strip("/")).strip("_")
    return f"{method.lower()}_{slug}"


def split_route_module(route_file: Path, service_name: str) -> None:
    text = route_file.read_text(encoding="utf-8")
    mod_dir = route_file.parent
    if (mod_dir / "controller.ts").exists() and "from \"./controller.ts\"" in text:
        return

    m = re.search(r"export const routes: RouteDef\[\] = \[([\s\S]*)\];", text)
    if not m:
        return

    header = text[: m.start()]
    body = m.group(1)
    chunks = re.split(r"\n(?=\{\s*\n\s*method:)", "\n" + body.strip())
    chunks = [c.strip() for c in chunks if c.strip() and "method:" in c]

    if not chunks:
        return

    handlers: list[tuple[str, str, str]] = []
    route_entries: list[str] = []

    for chunk in chunks:
        method_m = re.search(r'method:\s*"([^"]+)"', chunk)
        path_m = re.search(r'path:\s*"([^"]+)"', chunk)
        handler_m = re.search(r"handler:\s*(async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}),?\s*\n\s*\}", chunk)
        if not method_m or not path_m:
            continue
        method, path = method_m.group(1), path_m.group(1)
        name = fn_name(method, path)
        meta = chunk
        if handler_m:
            handler_body = handler_m.group(1)
            meta = chunk.replace(handler_m.group(0), f"handler: {name},")
            handlers.append((name, handler_body, method))
        route_entries.append(meta)

    if not handlers:
        return

    ctrl_imports = header
    for imp_line in [
        'import type { RouteHandler } from "../../../../_shared/core/router.ts";\n',
        'import * as service from "./service.ts";\n',
        'import * as validator from "./validator.ts";\n',
    ]:
        if imp_line not in ctrl_imports:
            ctrl_imports += imp_line

    ctrl_body = "\n\n".join(
        f"export const {name}: RouteHandler = {body};" for name, body, _ in handlers
    )
    write(mod_dir / "controller.ts", ctrl_imports + "\n" + ctrl_body + "\n")

    route_header = header
    if 'from "./controller.ts"' not in route_header:
        names = ", ".join(h[0] for h in handlers)
        route_header += f'import {{ {names} }} from "./controller.ts";\n'

    new_routes = "export const routes: RouteDef[] = [\n" + ",\n".join(route_entries) + "\n];\n"
    write(route_file, route_header + "\n" + new_routes)

    write(
        mod_dir / "service.ts",
        f'/** Domain logic for `{mod_dir.name}` — extend or call `_shared` libs from `../deps.ts`. */\n'
        f'export const SERVICE = "{service_name}";\n',
    )
    write(
        mod_dir / "validator.ts",
        f'/** Request/query validators for `{mod_dir.name}`. */\n'
        "export {};\n",
    )
    write(
        mod_dir / "index.ts",
        'export * from "./controller.ts";\n'
        'export * from "./service.ts";\n'
        'export * from "./validator.ts";\n'
        'export { routes } from "./route.ts";\n',
    )


def standard_health_module(svc: str) -> None:
    health_dir = ROOT / svc / "src" / "api" / "health"
    write(
        health_dir / "service.ts",
        f'export function healthPayload() {{\n'
        f'  return {{ status: "ok" as const, service: "{svc}" }};\n'
        f"}}\n",
    )
    write(health_dir / "validator.ts", "export {};\n")
    write(
        health_dir / "controller.ts",
        'import type { RouteHandler } from "../../../../_shared/core/router.ts";\n'
        'import { ok } from "../../../../_shared/core/response.ts";\n'
        'import { healthPayload } from "./service.ts";\n\n'
        "export const get: RouteHandler = async () => ok(healthPayload());\n",
    )
    write(
        health_dir / "route.ts",
        'import type { RouteDef } from "../../../../_shared/core/router.ts";\n'
        'import { get } from "./controller.ts";\n\n'
        "export const routes: RouteDef[] = [\n"
        '  { method: "GET", path: "/v1/health", handler: get },\n'
        "];\n",
    )
    write(
        health_dir / "index.ts",
        'export * from "./controller.ts";\n'
        'export * from "./service.ts";\n'
        'export * from "./validator.ts";\n'
        'export { routes } from "./route.ts";\n',
    )


def main() -> None:
    for svc in SERVICES:
        if not (ROOT / svc).is_dir():
            continue
        service_skeleton(svc)
        standard_health_module(svc)
        api = ROOT / svc / "src" / "api"
        if api.exists():
            # Do not auto-split route.ts into controller (fragile). Handlers stay in route.ts;
        # each module still has controller.ts, service.ts, validator.ts, index.ts for the contract.
        print("scaffolded", svc)


if __name__ == "__main__":
    main()
