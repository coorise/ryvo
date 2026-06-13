#!/usr/bin/env bash
# Rebuild local Next.js Docker images with compose/local.env (uses --network=host for bun install).
# Usage: bash scripts/rebuild-web-local.sh [admin|client|both]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET="${1:-both}"
COMPOSE_ENV="${ROOT}/compose/local.env"

bash scripts/ensure-env.sh

if [[ ! -f "$COMPOSE_ENV" ]]; then
  echo "Missing $COMPOSE_ENV"
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$COMPOSE_ENV"
set +a

build_one() {
  local app_dir="$1" tag="$2"
  local prod="${ROOT}/${app_dir}/.env.production"
  local cachebust=""
  [[ -f "$prod" ]] && cachebust="$(md5sum "$prod" | awk '{print $1}')"

  echo "==> docker build --network=host ${tag} (${app_dir})"
  docker build --network=host \
    -f "${ROOT}/${app_dir}/Dockerfile" \
    --build-arg "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
    --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    --build-arg "NEXT_PUBLIC_FUNCTIONS_URL=${NEXT_PUBLIC_FUNCTIONS_URL}" \
    --build-arg "NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV:-development}" \
    --build-arg "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-}" \
    --build-arg "CACHEBUST=${cachebust:-1}" \
    -t "${tag}:local" \
    "${ROOT}/${app_dir}"
}

recreate_one() {
  local name="$1" tag="$2"
  docker stop "$name" 2>/dev/null || true
  docker rm "$name" 2>/dev/null || true
  docker run -d \
    --name "$name" \
    --network ryvo-net \
    --restart unless-stopped \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    "${tag}:local"
  echo "  started ${name} (${tag}:local)"
}

case "$TARGET" in
  admin)
    build_one "client/web/ryvo_admin" "ryvo-web-admin"
    recreate_one "ryvo-web-admin" "ryvo-web-admin"
    ;;
  client)
    build_one "client/web/ryvo" "ryvo-web-client"
    recreate_one "ryvo-web-client" "ryvo-web-client"
    ;;
  both)
    build_one "client/web/ryvo_admin" "ryvo-web-admin"
    build_one "client/web/ryvo" "ryvo-web-client"
    recreate_one "ryvo-web-admin" "ryvo-web-admin"
    recreate_one "ryvo-web-client" "ryvo-web-client"
    ;;
  *)
    echo "Usage: $0 [admin|client|both]"
    exit 1
    ;;
esac

echo "==> done (hard-refresh localhost:3200 admin / :3300 client)"
