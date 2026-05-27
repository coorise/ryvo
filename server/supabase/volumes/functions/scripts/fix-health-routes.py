#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TEMPLATE = '''import type {{ RouteDef }} from "../../../../_shared/core/router.ts";
import {{ ok }} from "../../../../_shared/core/response.ts";

export const routes: RouteDef[] = [
  {{
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({{ status: "ok", service: "{service}" }}),
  }},
];
'''

for svc in ROOT.iterdir():
    if not svc.is_dir() or svc.name.startswith("_") or svc.name in ("ryvo-gateway", "main", "node_modules"):
        continue
    api = svc / "src" / "api"
    if not api.exists():
        continue
    health = api / "health" / "route.ts"
    if (api / "routes.ts").exists() or health.exists():
        health.parent.mkdir(parents=True, exist_ok=True)
        health.write_text(TEMPLATE.format(service=svc.name), encoding="utf-8")
        (api / "health" / "index.ts").write_text('export { routes } from "./route.ts";\n', encoding="utf-8")

print("health routes fixed")
