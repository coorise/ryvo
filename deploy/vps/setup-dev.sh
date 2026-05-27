#!/usr/bin/env bash
# One-time / repeat bootstrap for DEV stack on VPS (branch: dev).
# Usage: bash deploy/vps/setup-dev.sh
set -euo pipefail

if [[ -n "${BASH_SOURCE[0]:-}" && "${BASH_SOURCE[0]}" != "bash" ]]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
else
  ROOT="${RYVO_ROOT:-$HOME/Projects/Web/ryvo}"
fi
cd "$ROOT"

patch_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

echo "==> Ryvo dev VPS setup ($ROOT)"

git fetch origin dev
git checkout dev
git pull origin dev

bash scripts/ensure-env.sh

mkdir -p \
  server/kafka/data_dev \
  server/redis/data_dev \
  server/bunqueue/data_dev \
  server/supabase/volumes/db/data_dev \
  server/supabase/volumes/storage_dev

DEPLOY_ENV="${ROOT}/deploy/vps/.env.dev"
if [[ ! -f "$DEPLOY_ENV" ]]; then
  cp deploy/vps/.env.dev.example "$DEPLOY_ENV"
  echo "Created $DEPLOY_ENV"
fi

SUPABASE_ENV="${ROOT}/server/supabase/.env"
ANON_KEY="$(grep '^ANON_KEY=' "$SUPABASE_ENV" | cut -d= -f2- | tr -d "'\"")"
if [[ -z "$ANON_KEY" ]]; then
  echo "ERROR: ANON_KEY missing in $SUPABASE_ENV"
  exit 1
fi

patch_env "$SUPABASE_ENV" KONG_HTTP_PORT 8500
patch_env "$SUPABASE_ENV" KONG_HTTPS_PORT 8543
patch_env "$SUPABASE_ENV" SUPABASE_PUBLIC_URL https://ryvo-line-server.dev.agglomy.com
patch_env "$SUPABASE_ENV" API_EXTERNAL_URL https://ryvo-line-server.dev.agglomy.com
patch_env "$SUPABASE_ENV" SITE_URL https://ryvo-line.dev.agglomy.com
patch_env "$SUPABASE_ENV" ADDITIONAL_REDIRECT_URLS 'https://ryvo-line.dev.agglomy.com/*,https://ryvo-line-admin.dev.agglomy.com/*'

patch_env "$DEPLOY_ENV" RYVO_NETWORK_NAME ryvo-net-dev
patch_env "$DEPLOY_ENV" RYVO_ADMIN_PORT 3400
patch_env "$DEPLOY_ENV" RYVO_CLIENT_PORT 3500
patch_env "$DEPLOY_ENV" RYVO_API_PORT 8500
patch_env "$DEPLOY_ENV" NEXT_PUBLIC_SUPABASE_URL https://ryvo-line-server.dev.agglomy.com
patch_env "$DEPLOY_ENV" NEXT_PUBLIC_FUNCTIONS_URL https://ryvo-line-server.dev.agglomy.com/functions/v1
patch_env "$DEPLOY_ENV" NEXT_PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY"
patch_env "$DEPLOY_ENV" NEXT_PUBLIC_APP_ENV development
patch_env "$DEPLOY_ENV" SUPABASE_ENV_FILE ./server/supabase/.env
patch_env "$DEPLOY_ENV" KAFKA_ENV_FILE ./server/kafka/.env
patch_env "$DEPLOY_ENV" REDIS_ENV_FILE ./server/redis/.env
patch_env "$DEPLOY_ENV" BUNQUEUE_ENV_FILE ./server/bunqueue/.env

echo "==> Validating compose config"
docker compose -f docker-compose.dev.yaml --env-file "$DEPLOY_ENV" config --quiet

echo "==> Building and starting dev stack (this may take several minutes)"
docker compose -f docker-compose.dev.yaml --env-file "$DEPLOY_ENV" build --pull
docker compose -f docker-compose.dev.yaml --env-file "$DEPLOY_ENV" up -d

docker compose -f docker-compose.dev.yaml --env-file "$DEPLOY_ENV" exec -T caddy_dev \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

echo ""
echo "==> Dev stack status"
docker compose -f docker-compose.dev.yaml --env-file "$DEPLOY_ENV" ps

echo ""
echo "Host ports (point cPanel reverse proxy here):"
echo "  Admin:  http://$(hostname -I | awk '{print $1}'):3400"
echo "  Client: http://$(hostname -I | awk '{print $1}'):3500"
echo "  API:    http://$(hostname -I | awk '{print $1}'):8500"
echo ""
echo "Public URLs (after cPanel forwarding):"
echo "  https://ryvo-line-admin.dev.agglomy.com"
echo "  https://ryvo-line.dev.agglomy.com"
echo "  https://ryvo-line-server.dev.agglomy.com"
