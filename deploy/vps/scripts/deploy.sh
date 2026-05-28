#!/usr/bin/env bash
# Full VPS deploy (env + compose + caddy reload + health-check).
# Usage: bash deploy/vps/scripts/deploy.sh dev|prod
# Git sync is NOT included — run from setup-*.sh or the CI workflow after pull.
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
    COMPOSE_ENV="deploy/vps/.env.dev"
    CADDY_SERVICE="caddy_dev"
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/.env.prod"
    CADDY_SERVICE="caddy"
    ;;
esac

echo "==> deploy ($ENV_NAME)"

bash deploy/vps/scripts/apply-env.sh "$ENV_NAME"

if [[ "$ENV_NAME" == "dev" ]]; then
  mkdir -p \
    server/kafka/data_dev \
    server/redis/data_dev \
    server/bunqueue/data_dev \
    server/supabase/volumes/db/data_dev \
    server/supabase/volumes/storage_dev
fi

docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" config --quiet
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" build --pull
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" up -d

docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T "$CADDY_SERVICE" \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

bash deploy/vps/scripts/health-check.sh "$ENV_NAME"

echo "==> deploy ($ENV_NAME) done"
