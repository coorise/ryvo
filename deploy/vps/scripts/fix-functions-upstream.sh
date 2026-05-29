#!/usr/bin/env bash
# Repair Kong → functions DNS when admin API returns 503 "name resolution failed".
# Usage: bash deploy/vps/scripts/fix-functions-upstream.sh dev|prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-dev}"
case "$ENV_NAME" in
  dev)
    COMPOSE_FILE="docker-compose.dev.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.dev"
    ROUTER_SVC="ryvo-functions-router_dev"
    ACTIVE_FILE="deploy/vps/.active_color.dev"
    ROUTER_FILE="deploy/vps/compose/functions-router.dev.Caddyfile"
    API_PORT="${RYVO_API_PORT:-8500}"
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.prod"
    ROUTER_SVC="ryvo-functions-router"
    ACTIVE_FILE="deploy/vps/.active_color.prod"
    ROUTER_FILE="deploy/vps/compose/functions-router.prod.Caddyfile"
    API_PORT="${RYVO_API_PORT:-8400}"
    ;;
  *) echo "Usage: $0 dev|prod"; exit 1 ;;
esac

compose() {
  local args=(-f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV")
  [[ -f server/supabase/.env ]] && args+=(--env-file server/supabase/.env)
  docker compose "${args[@]}" "$@"
}

active="blue"
[[ -f "$ACTIVE_FILE" ]] && active="$(tr -d '[:space:]' <"$ACTIVE_FILE")"
[[ "$active" != "green" ]] && active="blue"

echo "==> fix functions upstream ($ENV_NAME, active=$active)"

compose up -d "$ROUTER_SVC"
compose up -d --force-recreate kong

if [[ "$ENV_NAME" == "dev" ]]; then
  cat >"$ROUTER_FILE" <<EOF
:9000 {
  reverse_proxy ryvo-functions_${active}_dev:9000
}
EOF
else
  cat >"$ROUTER_FILE" <<EOF
:9000 {
  reverse_proxy ryvo-functions_${active}:9000
}
EOF
fi

compose restart "$ROUTER_SVC"

for _ in $(seq 1 30); do
  if compose exec -T kong getent hosts functions >/dev/null 2>&1; then
    echo "  OK  Kong resolves functions"
    break
  fi
  sleep 2
done

code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 "http://127.0.0.1:${API_PORT}/functions/v1/hello" || echo "000")
echo "  /functions/v1/hello → HTTP $code"
if [[ "$code" != "200" ]]; then
  echo "FAIL: expected 200 from Kong path"
  compose logs --tail 40 "$ROUTER_SVC" kong 2>/dev/null || true
  exit 1
fi

echo "==> done"
