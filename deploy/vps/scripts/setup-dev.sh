#!/usr/bin/env bash
# First-time or manual dev VPS bootstrap (git sync + deploy).
# Usage: bash deploy/vps/scripts/setup-dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "==> Ryvo dev VPS setup"
git fetch origin dev && git checkout dev && git pull origin dev

bash deploy/vps/scripts/deploy.sh dev
