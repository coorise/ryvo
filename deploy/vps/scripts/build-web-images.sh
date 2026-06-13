#!/usr/bin/env bash
# Build admin + customer Next.js images on the VPS with NEXT_PUBLIC_* from compose env.
# Usage: bash deploy/vps/scripts/build-web-images.sh dev|prod [tag]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
IMAGE_TAG="${2:-dev}"

if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod [sha-<gitsha>|dev|prod]"
  exit 1
fi

bash deploy/vps/scripts/write-web-env-production.sh "$ENV_NAME"

# shellcheck source=/dev/null
source "deploy/vps/compose/.env.${ENV_NAME}"

PREFIX="${DOCKER_IMAGE_PREFIX:-coorise}"
URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
FUN="${NEXT_PUBLIC_FUNCTIONS_URL:-}"
ANON="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
MAPS="${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-${GOOGLE_MAPS_API_KEY:-}}"
APP_ENV="${NEXT_PUBLIC_APP_ENV:-development}"

build_one() {
  local app_dir="$1" image_name="$2"
  echo "==> docker build $image_name:$IMAGE_TAG ($app_dir)"
  local -a build_args=(
    --build-arg "NEXT_PUBLIC_SUPABASE_URL=$URL"
    --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON"
    --build-arg "NEXT_PUBLIC_FUNCTIONS_URL=$FUN"
    --build-arg "NEXT_PUBLIC_APP_ENV=$APP_ENV"
  )
  if [[ -n "$MAPS" && "$MAPS" != REPLACE_* ]]; then
    build_args+=(--build-arg "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$MAPS")
  fi
  if [[ -f "$app_dir/.env.production" ]]; then
    build_args+=(--build-arg "CACHEBUST=$(md5sum "$app_dir/.env.production" | awk '{print $1}')")
  fi
  docker build \
    -f "$app_dir/Dockerfile" \
    "${build_args[@]}" \
    -t "${PREFIX}/${image_name}:${IMAGE_TAG}" \
    "$app_dir"
}

echo "==> build-web-images ($ENV_NAME tag=$IMAGE_TAG)"
build_one "client/web/ryvo_admin" "ryvo-web-admin"
build_one "client/web/ryvo" "ryvo-web-client"
echo "==> done (local tags ${PREFIX}/ryvo-web-{admin,client}:${IMAGE_TAG})"
