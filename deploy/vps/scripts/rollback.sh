#!/usr/bin/env bash
# Roll back blue/green stateless traffic switch (web + functions router).
# Usage: bash deploy/vps/scripts/rollback.sh dev|prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod"
  exit 1
fi

case "$ENV_NAME" in
  dev)
    COMPOSE_FILE="docker-compose.dev.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.dev"
    CADDY_SERVICE="caddy_dev"
    ACTIVE_FILE="deploy/vps/.active_color.dev"
    ROUTER_FILE="deploy/vps/compose/functions-router.dev.Caddyfile"
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.prod"
    CADDY_SERVICE="caddy"
    ACTIVE_FILE="deploy/vps/.active_color.prod"
    ROUTER_FILE="deploy/vps/compose/functions-router.prod.Caddyfile"
    ;;
esac

active="$(cat "$ACTIVE_FILE" 2>/dev/null | tr -d '[:space:]' || true)"
[[ "$active" != "blue" && "$active" != "green" ]] && active="blue"
prev="green"
[[ "$active" == "green" ]] && prev="blue"

echo "==> rollback ($ENV_NAME) active=$active -> $prev"

if [[ "$ENV_NAME" == "dev" ]]; then
  cat >"$ROUTER_FILE" <<EOF
:9000 { reverse_proxy ryvo-functions_${prev}_dev:9000 }
EOF
  cat >network/caddy/Caddyfile.dev <<EOF
:3400 { reverse_proxy ryvo-web-admin_${prev}_dev:3000 }
:3500 { reverse_proxy ryvo-web-client_${prev}_dev:3000 }
:8500 { reverse_proxy kong:8000 }
EOF
else
  cat >"$ROUTER_FILE" <<EOF
:9000 { reverse_proxy ryvo-functions_${prev}:9000 }
EOF
  cat >network/caddy/Caddyfile.prod <<EOF
:3200 { reverse_proxy ryvo-web-admin_${prev}:3000 }
:3300 { reverse_proxy ryvo-web-client_${prev}:3000 }
:8400 { reverse_proxy kong:8000 }
EOF
fi

if [[ "$ENV_NAME" == "dev" ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T ryvo-functions-router_dev \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
else
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T ryvo-functions-router \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
fi

docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T "$CADDY_SERVICE" \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

echo "$prev" >"$ACTIVE_FILE"
echo "==> rollback ($ENV_NAME) done"

