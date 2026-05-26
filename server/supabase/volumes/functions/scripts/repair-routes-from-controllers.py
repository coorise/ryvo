#!/usr/bin/env python3
"""Rebuild broken route.ts from controller.ts exports + metadata in broken route file."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PARAM_MAP = {
    "user_id": ":user_id",
    "driver_id": ":driver_id",
    "trip_id": ":trip_id",
    "role_id": ":role_id",
    "template_key": ":template_key",
    "vehicle_category": ":vehicle_category",
    "request_id": ":request_id",
    "doc_type": ":doc_type",
    "id": ":id",
    "driverId": ":driverId",
}


def fn_to_path(name: str) -> str:
    m = re.match(r"^(get|post|patch|put|delete)_(.+)$", name)
    if not m:
        return "/v1/unknown"
    parts = m.group(2).split("_")
    segs = []
    i = 0
    while i < len(parts):
        p = parts[i]
        if p in PARAM_MAP:
            segs.append(PARAM_MAP[p].lstrip(":"))
            i += 1
            continue
        if i + 1 < len(parts) and f"{p}_{parts[i+1]}" in PARAM_MAP:
            segs.append(PARAM_MAP[f"{p}_{parts[i+1]}"].lstrip(":"))
            i += 2
            continue
        if p.endswith("_id") and p not in ("v1",):
            segs.append(f":{p}")
            i += 1
            continue
        segs.append(p)
        i += 1
    path = "/" + "/".join(segs)
    for k, v in PARAM_MAP.items():
        path = path.replace(f"/{k}/", f"/{v}/").replace(f"/{k}", f"/{v}")
    return path


def fn_to_method(name: str) -> str:
    return re.match(r"^(get|post|patch|put|delete)", name).group(1).upper()  # type: ignore


def parse_meta_from_broken(text: str, handler_name: str) -> dict:
    meta: dict = {}
    idx = text.find(f"handler: {handler_name}")
    if idx < 0:
        return meta
    chunk = text[max(0, idx - 400) : idx]
    for key in ("auth", "permissions", "permissionsAny", "requireVerifiedEmail", "rateLimit"):
        m = re.search(rf"{key}:\s*([^,\n]+)", chunk)
        if m:
            meta[key] = m.group(1).strip()
    m = re.search(r'method:\s*"([^"]+)"', chunk)
    if m:
        meta["method"] = m.group(1)
    m = re.search(r'path:\s*"([^"]+)"', chunk)
    if m:
        meta["path"] = m.group(1)
    return meta


def controller_handlers(ctrl_path: Path) -> list[str]:
    text = ctrl_path.read_text(encoding="utf-8")
    return re.findall(r"export const (\w+): RouteHandler", text)


def repair_module(mod_dir: Path) -> bool:
    ctrl = mod_dir / "controller.ts"
    route = mod_dir / "route.ts"
    if not ctrl.exists() or not route.exists():
        return False
    handlers = controller_handlers(ctrl)
    if not handlers:
        return False
    broken = route.read_text(encoding="utf-8")
    imports = []
    for line in broken.splitlines():
        if line.startswith("import ") and "controller" not in line and "RouteDef" in line or (
            line.startswith("import type") and "RouteDef" in line
        ):
            imports.append(line)
        elif line.startswith("import type") and "RouteDef" in line:
            imports.append(line)
        elif line.startswith("import {") and "_shared" in line:
            imports.append(line)
    # dedupe imports
    seen = set()
    header = []
    for line in broken.splitlines():
        if line.startswith("import "):
            if line not in seen:
                seen.add(line)
                header.append(line)
        elif line.startswith("export const routes"):
            break
    if not any("RouteDef" in h for h in header):
        header.insert(0, 'import type { RouteDef } from "../../../../_shared/core/router.ts";')
    names = ", ".join(handlers)
    if not any("from \"./controller.ts\"" in h for h in header):
        header.append(f'import {{ {names} }} from "./controller.ts";')

    entries = []
    for h in handlers:
        meta = parse_meta_from_broken(broken, h)
        method = meta.get("method") or fn_to_method(h)
        path = meta.get("path") or fn_to_path(h)
        lines = [f"  {{", f'    method: "{method}",', f'    path: "{path}",']
        if "auth" in meta:
            lines.append(f"    auth: {meta['auth']},")
        if "permissions" in meta:
            lines.append(f"    permissions: {meta['permissions']},")
        if "permissionsAny" in meta:
            lines.append(f"    permissionsAny: {meta['permissionsAny']},")
        if "requireVerifiedEmail" in meta:
            lines.append(f"    requireVerifiedEmail: {meta['requireVerifiedEmail']},")
        if "rateLimit" in meta:
            lines.append(f"    rateLimit: {meta['rateLimit']},")
        lines.append(f"    handler: {h},")
        lines.append("  },")
        entries.append("\n".join(lines))

    new_route = "\n".join(header) + "\n\nexport const routes: RouteDef[] = [\n" + "\n".join(entries) + "\n];\n"
    if new_route != broken:
        route.write_text(new_route, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for ctrl in ROOT.glob("*/src/api/**/controller.ts"):
        if repair_module(ctrl.parent):
            n += 1
            print("repaired", ctrl.parent.relative_to(ROOT))
    print("total", n)


if __name__ == "__main__":
    main()
