#!/usr/bin/env bash
# Portable stack start — migrations, seeds, and demo users run inside Compose.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/ensure-env.sh

if docker ps -a --format '{{.Names}}' | grep -q '^supabase-kong$'; then
  legacy_project="$(docker inspect supabase-kong --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || true)"
  if [[ "$legacy_project" == "supabase" ]]; then
    echo "Legacy Supabase (project: supabase) detected. Run: bash scripts/migrate-unified-compose.sh"
    exit 1
  fi
fi

echo "==> Starting Ryvo stack (migrate + bootstrap included)..."
docker compose up -d --build

echo ""
echo "Ryvo-Line ready:"
echo "  API:      http://localhost:8400"
echo "  Functions http://localhost:8400/functions/v1/<service>/v1/..."
echo ""
echo "Test users (auto-seeded):"
echo "  client@ryvo-line.com / Client@123"
echo "  driver@ryvo-line.com / Driver@123"
echo "  admin@ryvo-line.com  / Admin@123"
echo ""
echo "Optional E2E smoke: docker compose --profile smoke run --rm ryvo-smoke"
echo "Host E2E script:     bash scripts/e2e-ride-flow.sh"
