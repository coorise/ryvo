#!/usr/bin/env bash
# Bootstrap + start PROD stack on VPS. Usage: bash deploy/scripts/setup-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Ryvo prod VPS setup"
git fetch origin main && git checkout main && git pull origin main

bash deploy/scripts/apply-env.sh prod

COMPOSE_ENV="deploy/compose/.env.prod"
docker compose -f docker-compose.prod.yaml --env-file "$COMPOSE_ENV" config --quiet
docker compose -f docker-compose.prod.yaml --env-file "$COMPOSE_ENV" up -d --build

docker compose -f docker-compose.prod.yaml --env-file "$COMPOSE_ENV" exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

bash deploy/scripts/health-check.sh prod
