#!/usr/bin/env bash
# Apply idempotent SQL seeds from server/supabase/scripts/seeds (inside ryvo-functions image).
# Runs on every deploy; only new or changed migration files are applied.
# Usage: bash deploy/vps/scripts/run-migrations.sh dev|prod sha-<gitsha>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
IMAGE_TAG="${2:-}"

if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod sha-<gitsha>"
  exit 1
fi
if [[ -z "$IMAGE_TAG" ]]; then
  echo "Usage: $0 dev|prod sha-<gitsha>"
  exit 1
fi

case "$ENV_NAME" in
  dev)
    COMPOSE_FILE="docker-compose.dev.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.dev"
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.prod"
    ;;
esac

export DOCKER_IMAGE_PREFIX="${DOCKER_IMAGE_PREFIX:-coorise}"
export RYVO_IMAGE_TAG="$IMAGE_TAG"

compose() {
  local args=(-f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV")
  [[ -f server/supabase/.env ]] && args+=(--env-file server/supabase/.env)
  docker compose "${args[@]}" "$@"
}

FUN_REF="${DOCKER_IMAGE_PREFIX}/ryvo-functions:${RYVO_IMAGE_TAG}"

echo "==> run-migrations ($ENV_NAME tag=$RYVO_IMAGE_TAG)"
echo "  migration runner: ryvo-migrate (image $FUN_REF)"
echo "  seeds: /opt/ryvo/seeds/*.sql (baked into ryvo-functions image at CI build)"

if ! docker image inspect "$FUN_REF" >/dev/null 2>&1; then
  echo "  image not local — pulling $FUN_REF"
  docker pull "$FUN_REF"
fi

# Ensure Postgres + Kong are up before migrate (compose up -d should have run already).
compose up -d db kong

echo "  applying migrations (idempotent — skips unchanged seeds)..."
compose --profile migrate run --rm --pull always ryvo-migrate

echo "==> run-migrations done"
