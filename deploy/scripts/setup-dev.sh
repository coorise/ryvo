#!/usr/bin/env bash
# Bootstrap + start DEV stack on VPS. Usage: bash deploy/scripts/setup-dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Ryvo dev VPS setup"
git fetch origin dev && git checkout dev && git pull origin dev

bash deploy/scripts/apply-env.sh dev

mkdir -p \
  server/kafka/data_dev \
  server/redis/data_dev \
  server/bunqueue/data_dev \
  server/supabase/volumes/db/data_dev \
  server/supabase/volumes/storage_dev

COMPOSE_ENV="deploy/compose/.env.dev"
docker compose -f docker-compose.dev.yaml --env-file "$COMPOSE_ENV" config --quiet
docker compose -f docker-compose.dev.yaml --env-file "$COMPOSE_ENV" up -d --build

docker compose -f docker-compose.dev.yaml --env-file "$COMPOSE_ENV" exec -T caddy_dev \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

bash deploy/scripts/health-check.sh dev
