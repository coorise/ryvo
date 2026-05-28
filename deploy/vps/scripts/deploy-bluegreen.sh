#!/usr/bin/env bash
# Blue/green deploy for stateless services (web + functions) on a single VPS.
# Usage: bash deploy/vps/scripts/deploy-bluegreen.sh dev|prod sha-<gitsha>
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
    CADDY_SERVICE="caddy_dev"
    ACTIVE_FILE="deploy/vps/.active_color.dev"
    ROUTER_FILE="deploy/vps/compose/functions-router.dev.Caddyfile"
    ADMIN_PORT="3400"
    CLIENT_PORT="3500"
    API_PORT="8500"
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.prod"
    CADDY_SERVICE="caddy"
    ACTIVE_FILE="deploy/vps/.active_color.prod"
    ROUTER_FILE="deploy/vps/compose/functions-router.prod.Caddyfile"
    ADMIN_PORT="3200"
    CLIENT_PORT="3300"
    API_PORT="8400"
    ;;
esac

# Docker Hub: coorise/ryvo-web-admin:sha-<gitsha> (set DOCKER_IMAGE_PREFIX in VPS .env if different)
export DOCKER_IMAGE_PREFIX="${DOCKER_IMAGE_PREFIX:-coorise}"
export RYVO_IMAGE_TAG="$IMAGE_TAG"

if [[ -n "${DOCKER_TOKEN:-}" && -n "${DOCKER_USERNAME:-}" ]]; then
  echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

echo "==> bluegreen deploy ($ENV_NAME) tag=$RYVO_IMAGE_TAG"

bash deploy/vps/scripts/apply-env.sh "$ENV_NAME"

if [[ ! -f "$ACTIVE_FILE" ]]; then
  echo "blue" >"$ACTIVE_FILE"
fi
active="$(cat "$ACTIVE_FILE" | tr -d '[:space:]')"
if [[ "$active" != "blue" && "$active" != "green" ]]; then
  active="blue"
fi
next="green"
[[ "$active" == "green" ]] && next="blue"

echo "  active=$active next=$next"

docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" config --quiet

echo "==> pull images (tag=$RYVO_IMAGE_TAG)"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" pull \
  "ryvo-web-admin_${next}_dev" "ryvo-web-client_${next}_dev" "ryvo-functions_${next}_dev" 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" pull \
  "ryvo-web-admin_${next}" "ryvo-web-client_${next}" "ryvo-functions_${next}" 2>/dev/null || true
docker pull "${DOCKER_IMAGE_PREFIX}/ryvo-web-admin:${RYVO_IMAGE_TAG}" || true
docker pull "${DOCKER_IMAGE_PREFIX}/ryvo-web-client:${RYVO_IMAGE_TAG}" || true
docker pull "${DOCKER_IMAGE_PREFIX}/ryvo-functions:${RYVO_IMAGE_TAG}" || true

echo "==> start base stack (stateful stays single)"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" up -d

echo "==> run migrations/bootstraps"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" --profile migrate run --rm ryvo-migrate || true

echo "==> start next color services"
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" up -d \
  "ryvo-web-admin_${next}_dev" "ryvo-web-client_${next}_dev" "ryvo-functions_${next}_dev" 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" up -d \
  "ryvo-web-admin_${next}" "ryvo-web-client_${next}" "ryvo-functions_${next}" 2>/dev/null || true

echo "==> wait for next functions to answer /hello via direct container"
ok=0
for _ in $(seq 1 90); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T "ryvo-functions_${next}_dev" \
    bun -e "fetch('http://127.0.0.1:9000/hello').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    ok=1; break
  fi
  if docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T "ryvo-functions_${next}" \
    bun -e "fetch('http://127.0.0.1:9000/hello').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    ok=1; break
  fi
  sleep 2
done
if [[ "$ok" -ne 1 ]]; then
  echo "FAIL: next color functions did not become healthy"
  exit 1
fi

echo "==> switch functions router to $next"
if [[ "$ENV_NAME" == "dev" ]]; then
  cat >"$ROUTER_FILE" <<EOF
:9000 {
  reverse_proxy ryvo-functions_${next}_dev:9000
}
EOF
else
  cat >"$ROUTER_FILE" <<EOF
:9000 {
  reverse_proxy ryvo-functions_${next}:9000
}
EOF
fi
if [[ "$ENV_NAME" == "dev" ]]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T ryvo-functions-router_dev \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
else
  docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T ryvo-functions-router \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
fi

echo "==> switch edge Caddy upstreams to $next"
if [[ "$ENV_NAME" == "dev" ]]; then
  cat >network/caddy/Caddyfile.dev <<EOF
:3400 { reverse_proxy ryvo-web-admin_${next}_dev:3000 }
:3500 { reverse_proxy ryvo-web-client_${next}_dev:3000 }
:8500 { reverse_proxy kong:8000 }
EOF
else
  cat >network/caddy/Caddyfile.prod <<EOF
:3200 { reverse_proxy ryvo-web-admin_${next}:3000 }
:3300 { reverse_proxy ryvo-web-client_${next}:3000 }
:8400 { reverse_proxy kong:8000 }
EOF
fi

docker compose -f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV" exec -T "$CADDY_SERVICE" \
  caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

echo "==> health-check after switch"
bash deploy/vps/scripts/health-check.sh "$ENV_NAME"

echo "$next" >"$ACTIVE_FILE"
echo "==> bluegreen deploy ($ENV_NAME) done (active=$next)"

