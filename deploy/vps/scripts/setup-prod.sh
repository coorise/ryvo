#!/usr/bin/env bash
# First-time or manual prod VPS bootstrap (git sync + deploy).
# Usage: bash deploy/vps/scripts/setup-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "==> Ryvo prod VPS setup"
git fetch origin main && git checkout main && git pull origin main

bash deploy/vps/scripts/deploy.sh prod
