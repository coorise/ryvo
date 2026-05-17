#!/usr/bin/env bash
# Move from standalone server/supabase compose (project: supabase) to root compose (project: ryvo).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

legacy_project() {
  docker inspect "$1" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || echo ""
}

if docker ps -a --format '{{.Names}}' | grep -q '^supabase-kong$'; then
  proj="$(legacy_project supabase-kong)"
  if [[ "$proj" == "supabase" ]]; then
    echo "==> Stopping legacy Supabase stack (compose project: supabase)..."
    (cd server/supabase && docker compose -f docker-compose.yml -f docker-compose.s3.yml down)
  fi
fi

echo "==> Stopping partial ryvo project (will recreate with Supabase included)..."
docker compose down 2>/dev/null || true

bash scripts/ensure-env.sh

echo "==> Starting unified ryvo stack..."
docker compose up -d

echo ""
echo "Done. Verify with: docker compose ps"
