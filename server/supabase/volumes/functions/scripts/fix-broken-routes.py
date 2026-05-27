#!/usr/bin/env python3
"""Repair route.ts files broken by scaffold (handler: fn,,, -> handler: fn, },)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for route_file in ROOT.glob("*/src/api/**/route.ts"):
    text = route_file.read_text(encoding="utf-8")
    if ",,," not in text and ",," not in text:
        continue
    fixed = re.sub(r"handler:\s*([a-zA-Z0-9_]+),+,", r"handler: \1,\n  },", text)
    fixed = re.sub(r"handler:\s*([a-zA-Z0-9_]+),+\n\];", r"handler: \1,\n  },\n];", fixed)
    if fixed != text:
        route_file.write_text(fixed, encoding="utf-8")
        print("fixed", route_file.relative_to(ROOT))
