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
    ;;
  prod)
    COMPOSE_FILE="docker-compose.prod.yaml"
    COMPOSE_ENV="deploy/vps/compose/.env.prod"
    CADDY_SERVICE="caddy"
    ACTIVE_FILE="deploy/vps/.active_color.prod"
    ROUTER_FILE="deploy/vps/compose/functions-router.prod.Caddyfile"
    ;;
esac

# Docker Hub: coorise/ryvo-web-admin:sha-<gitsha>
export DOCKER_IMAGE_PREFIX="${DOCKER_IMAGE_PREFIX:-coorise}"
export RYVO_IMAGE_TAG="$IMAGE_TAG"

if [[ -n "${DOCKER_TOKEN:-}" && -n "${DOCKER_USERNAME:-}" ]]; then
  echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

echo "==> bluegreen deploy ($ENV_NAME) tag=$RYVO_IMAGE_TAG"

bash deploy/vps/scripts/apply-env.sh "$ENV_NAME"

compose() {
  local args=(-f "$COMPOSE_FILE" --env-file "$COMPOSE_ENV")
  [[ -f server/supabase/.env ]] && args+=(--env-file server/supabase/.env)
  docker compose "${args[@]}" "$@"
}

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

compose config --quiet

echo "==> build web images on VPS (bake NEXT_PUBLIC_* from $COMPOSE_ENV)"
bash deploy/vps/scripts/build-web-images.sh "$ENV_NAME" "$RYVO_IMAGE_TAG"

echo "==> pull functions image (tag=$RYVO_IMAGE_TAG)"
compose pull "ryvo-functions_${next}_dev" 2>/dev/null || true
compose pull "ryvo-functions_${next}" 2>/dev/null || true
docker pull "${DOCKER_IMAGE_PREFIX}/ryvo-functions:${RYVO_IMAGE_TAG}" || true

echo "==> start base stack (stateful stays single)"
compose up -d

echo "==> ensure functions router (Kong upstream: http://functions:9000)"
if [[ "$ENV_NAME" == "dev" ]]; then
  compose up -d ryvo-functions-router_dev
else
  compose up -d ryvo-functions-router
fi

ensure_kong_resolves_functions() {
  local i
  for i in $(seq 1 40); do
    if compose exec -T kong getent hosts functions >/dev/null 2>&1; then
      echo "  OK  Kong resolves functions"
      return 0
    fi
    if [[ "$i" -eq 8 ]]; then
      echo "  WARN Kong cannot resolve functions — recreating kong (attach ryvo-net)"
      compose up -d --force-recreate kong
    fi
    sleep 2
  done
  echo "FAIL: Kong still cannot resolve host functions (is ryvo-functions-router running on ryvo-net?)"
  compose ps ryvo-functions-router_dev ryvo-functions-router kong 2>/dev/null || true
  return 1
}
ensure_kong_resolves_functions

echo "==> run migrations/bootstraps"
compose --profile migrate run --rm ryvo-migrate

echo "==> start next color services"
compose up -d \
  "ryvo-web-admin_${next}_dev" "ryvo-web-client_${next}_dev" "ryvo-functions_${next}_dev" 2>/dev/null || true
compose up -d \
  "ryvo-web-admin_${next}" "ryvo-web-client_${next}" "ryvo-functions_${next}" 2>/dev/null || true

echo "==> wait for next functions to answer /hello via direct container"
ok=0
for _ in $(seq 1 90); do
  if compose exec -T "ryvo-functions_${next}_dev" \
    bun -e "fetch('http://127.0.0.1:9000/hello').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    ok=1; break
  fi
  if compose exec -T "ryvo-functions_${next}" \
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
  compose up -d ryvo-functions-router_dev
  compose exec -T ryvo-functions-router_dev \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || \
    compose restart ryvo-functions-router_dev
else
  compose up -d ryvo-functions-router
  compose exec -T ryvo-functions-router \
    caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || \
    compose restart ryvo-functions-router
fi

write_edge_caddyfile() {
  local color="$1"
  if [[ "$ENV_NAME" == "dev" ]]; then
    cat >network/caddy/Caddyfile.dev <<EOF
# Dev VPS — switched by deploy-bluegreen.sh (active: ${color})
:3400 {
	reverse_proxy ryvo-web-admin_${color}_dev:3000
}
:3500 {
	reverse_proxy ryvo-web-client_${color}_dev:3000
}
:8500 {
	reverse_proxy kong:8000
}
EOF
  else
    cat >network/caddy/Caddyfile.prod <<EOF
# Prod VPS — switched by deploy-bluegreen.sh (active: ${color})
:3200 {
	reverse_proxy ryvo-web-admin_${color}:3000
}
:3300 {
	reverse_proxy ryvo-web-client_${color}:3000
}
:8400 {
	reverse_proxy kong:8000
}
EOF
  fi
}

echo "==> switch edge Caddy upstreams to $next"
write_edge_caddyfile "$next"

reload_edge_caddy() {
  if ! compose exec -T "$CADDY_SERVICE" caddy reload --config /etc/caddy/Caddyfile; then
    echo "  caddy reload failed — restarting $CADDY_SERVICE"
    compose restart "$CADDY_SERVICE"
  fi
}

reload_edge_caddy

echo "==> health-check after switch (allow warm-up)"
sleep 15
if ! bash deploy/vps/scripts/health-check.sh "$ENV_NAME"; then
  echo "==> health-check failed — rolling back traffic to $active"
  if [[ "$ENV_NAME" == "dev" ]]; then
    cat >"$ROUTER_FILE" <<EOF
:9000 { reverse_proxy ryvo-functions_${active}_dev:9000 }
EOF
    write_edge_caddyfile "$active"
    compose exec -T ryvo-functions-router_dev caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
  else
    cat >"$ROUTER_FILE" <<EOF
:9000 { reverse_proxy ryvo-functions_${active}:9000 }
EOF
    write_edge_caddyfile "$active"
    compose exec -T ryvo-functions-router caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
  fi
  reload_edge_caddy
  exit 1
fi

echo "$next" >"$ACTIVE_FILE"
echo "==> bluegreen deploy ($ENV_NAME) done (active=$next)"
