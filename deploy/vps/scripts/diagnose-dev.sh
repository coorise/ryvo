#!/usr/bin/env bash
# Quick dev VPS diagnostics when admin UI shows blank / functions 502.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.dev.yaml"
COMPOSE_ENV="deploy/vps/compose/.env.dev"
# shellcheck source=/dev/null
[[ -f "$COMPOSE_ENV" ]] && source "$COMPOSE_ENV"
API_PORT="${RYVO_API_PORT:-8500}"

echo "==> containers"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" ps ryvo-functions kong caddy_dev 2>/dev/null || true

echo "==> functions /hello (localhost:${API_PORT})"
curl -sS -w "\nHTTP %{http_code}\n" --connect-timeout 5 "http://127.0.0.1:${API_PORT}/functions/v1/hello" || true

echo "==> ryvo-functions logs (last 80 lines)"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" logs --tail 80 ryvo-functions 2>/dev/null || true
