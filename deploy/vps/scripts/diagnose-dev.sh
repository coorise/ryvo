#!/usr/bin/env bash
# Quick dev VPS diagnostics when admin UI shows blank / functions 503.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.dev.yaml"
COMPOSE_ENV="deploy/vps/compose/.env.dev"
# shellcheck source=/dev/null
[[ -f "$COMPOSE_ENV" ]] && source "$COMPOSE_ENV"
API_PORT="${RYVO_API_PORT:-8500}"

compose() {
  local args=(-f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV")
  [[ -f server/supabase/.env ]] && args+=(--env-file server/supabase/.env)
  docker compose "${args[@]}" "$@"
}

echo "==> containers (kong, functions router, blue/green)"
compose ps kong ryvo-functions-router_dev ryvo-functions_blue_dev ryvo-functions_green_dev 2>/dev/null || true

echo "==> Kong networks"
docker inspect supabase-kong_dev --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || \
  docker inspect supabase-kong --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true

echo "==> Kong DNS: functions"
compose exec -T kong getent hosts functions 2>/dev/null || echo "  FAIL cannot resolve functions"

echo "==> router → active color"
compose exec -T ryvo-functions-router_dev wget -qO- http://127.0.0.1:9000/hello 2>/dev/null || \
  compose exec -T ryvo-functions-router_dev caddy validate --config /etc/caddy/Caddyfile 2>/dev/null || true

echo "==> functions /hello (localhost:${API_PORT})"
curl -sS -w "\nHTTP %{http_code}\n" --connect-timeout 8 "http://127.0.0.1:${API_PORT}/functions/v1/hello" || true

echo "==> functions router logs (last 40)"
compose logs --tail 40 ryvo-functions-router_dev 2>/dev/null || true

echo "==> active functions color logs (last 40)"
active="blue"
[[ -f deploy/vps/.active_color.dev ]] && active="$(tr -d '[:space:]' <deploy/vps/.active_color.dev)"
compose logs --tail 40 "ryvo-functions_${active}_dev" 2>/dev/null || true

echo "==> fix: bash deploy/vps/scripts/fix-functions-upstream.sh dev"
