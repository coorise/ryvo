#!/usr/bin/env python3
"""Insert missing `},` after handler lines in route.ts modules."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fix_file(path: Path) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    changed = False
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        stripped = line.strip()
        if re.match(r"handler:\s*\w+,?\s*$", stripped) or (
            stripped.startswith("handler:") and not stripped.endswith("{")
        ):
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if nxt.startswith("{") or nxt == "];" or nxt.startswith("];"):
                out.append("  },")
                changed = True
        i += 1
    if changed:
        path.write_text("\n".join(out) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    n = 0
    for p in ROOT.glob("*/src/api/**/route.ts"):
        if fix_file(p):
            n += 1
            print("fixed", p.relative_to(ROOT))
    print("total", n)


if __name__ == "__main__":
    main()
