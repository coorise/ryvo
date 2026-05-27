#!/usr/bin/env python3
"""Restore core/legacy route modules from git HEAD handler.ts (full route bodies)."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICES = [
    "trip-lifecycle",
    "notification-service",
    "payment-gateway",
    "support-service",
    "kyc-service",
    "geofence-service",
    "gdpr-service",
    "cron-jobs",
    "audit-service",
    "coupon-service",
    "profile-service",
    "routing-engine",
    "location-ingest",
    "matching-engine",
    "shift-service",
    "storage-service",
    "trip-chat",
    "payout-service",
]


def git_handler(svc: str) -> str | None:
    r = subprocess.run(
        ["git", "show", f"HEAD:server/supabase/volumes/functions/{svc}/src/handler.ts"],
        cwd=ROOT.parent.parent.parent.parent,
        capture_output=True,
        text=True,
    )
    return r.stdout if r.returncode == 0 else None


def extract_prelude_and_routes(text: str) -> tuple[str, str]:
    m = re.search(r"export const handle = createServiceRouter\(\s*\"[^\"]+\",\s*\[", text)
    if not m:
        raise ValueError("no router")
    prelude = text[: m.start()]
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
    return prelude, routes_body


def write_core_module(svc: str, prelude: str, routes_body: str, module: str = "core") -> None:
    mod = ROOT / svc / "src" / "api" / module
    mod.mkdir(parents=True, exist_ok=True)
    prelude = prelude.replace("../../_shared/", "../../../../_shared/")
    route_ts = (
        prelude
        + "import type { RouteDef } from \"../../../../_shared/core/router.ts\";\n\n"
        + f"export const routes: RouteDef[] = [{routes_body}];\n"
    )
    (mod / "route.ts").write_text(route_ts, encoding="utf-8")
    (mod / "controller.ts").write_text(
        '/** Handlers live in route.ts for this module; re-export for api/index contract. */\n'
        "export { routes } from \"./route.ts\";\n",
        encoding="utf-8",
    )
    (mod / "service.ts").write_text(
        f'export const SERVICE = "{svc}";\n',
        encoding="utf-8",
    )
    (mod / "validator.ts").write_text("export {};\n", encoding="utf-8")
    (mod / "index.ts").write_text(
        'export * from "./controller.ts";\n'
        'export * from "./service.ts";\n'
        'export * from "./validator.ts";\n'
        'export { routes } from "./route.ts";\n',
        encoding="utf-8",
    )


def filter_out_health(routes_body: str) -> str:
    chunks = re.split(r"\n(?=\s*\{)", "\n" + routes_body)
    kept = []
    for c in chunks:
        if "/v1/health" in c and "health" in c.lower():
            continue
        if c.strip():
            kept.append(c.strip())
    return ",\n".join(kept)


def main() -> None:
    for svc in SERVICES:
        text = git_handler(svc)
        if not text:
            continue
        prelude, routes_body = extract_prelude_and_routes(text)
        routes_body = filter_out_health(routes_body)
        module = "legacy" if (ROOT / svc / "src" / "api" / "legacy").exists() else "core"
        if not routes_body.strip():
            continue
        write_core_module(svc, prelude, routes_body, module)
        print("restored", svc, module)


if __name__ == "__main__":
    main()
