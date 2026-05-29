#!/usr/bin/env bash
# Merge deploy/vps templates into runtime .env files (server/*, compose, client).
# Usage: bash deploy/vps/scripts/apply-env.sh dev|prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod"
  exit 1
fi

VPS="deploy/vps"

patch_env() {
  local file="$1" key="$2" value="$3"
  [[ -f "$file" ]] || touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >>"$file"
  fi
}

apply_template() {
  local template="$1" target="$2"
  [[ -f "$template" ]] || return 0
  [[ -f "$target" ]] || touch "$target"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//$'\r'/}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      patch_env "$target" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    fi
  done <"$template"
  echo "  applied $(basename "$template") -> $target"
}

echo "==> apply-env ($ENV_NAME)"

bash scripts/ensure-env.sh

for mod in supabase kafka redis bunqueue; do
  target="server/${mod}/.env"
  base_deploy="${VPS}/server/${mod}/env.example"
  overlay="${VPS}/server/${mod}/env.${ENV_NAME}.example"
  if [[ "$mod" != "supabase" && -f "$base_deploy" ]]; then
    cp -n "server/${mod}/.env.example" "$target" 2>/dev/null || cp "server/${mod}/.env.example" "$target"
    apply_template "$base_deploy" "$target"
  fi
  if [[ "$ENV_NAME" == "prod" ]]; then
    apply_template "$overlay" "$target"
  elif [[ "$mod" == "supabase" ]]; then
    apply_template "$base_deploy" "$target"
  fi
done

if [[ -f server/supabase/.env ]]; then
  sed -i '/^KONG_HTTP_PORT=/d;/^KONG_HTTPS_PORT=/d' server/supabase/.env
fi

COMPOSE_EX="${VPS}/compose/env.${ENV_NAME}.example"
COMPOSE_OUT="${VPS}/compose/.env.${ENV_NAME}"
mkdir -p "${VPS}/compose"
legacy="${VPS}/.env.${ENV_NAME}"
if [[ -f "$legacy" && ! -f "$COMPOSE_OUT" ]]; then
  mv "$legacy" "$COMPOSE_OUT"
  echo "  migrated $legacy -> $COMPOSE_OUT"
fi
saved_docker_user=""
saved_docker_token=""
if [[ -f "$COMPOSE_OUT" ]]; then
  # grep exits 1 when missing — do not use bare pipelines with set -o pipefail
  if grep -q '^DOCKER_USERNAME=' "$COMPOSE_OUT" 2>/dev/null; then
    saved_docker_user="$(grep '^DOCKER_USERNAME=' "$COMPOSE_OUT" | cut -d= -f2- | tr -d "'\"" | head -1)"
  fi
  if grep -q '^DOCKER_TOKEN=' "$COMPOSE_OUT" 2>/dev/null; then
    saved_docker_token="$(grep '^DOCKER_TOKEN=' "$COMPOSE_OUT" | cut -d= -f2- | tr -d "'\"" | head -1)"
  fi
fi
cp "$COMPOSE_EX" "$COMPOSE_OUT"
if [[ -n "$saved_docker_user" && "$saved_docker_user" != REPLACE_* ]]; then
  patch_env "$COMPOSE_OUT" DOCKER_USERNAME "$saved_docker_user"
fi
if [[ -n "$saved_docker_token" && "$saved_docker_token" != REPLACE_* ]]; then
  patch_env "$COMPOSE_OUT" DOCKER_TOKEN "$saved_docker_token"
fi
if [[ -f server/supabase/.env ]]; then
  for key in ANON_KEY SERVICE_ROLE_KEY JWT_SECRET POSTGRES_PASSWORD POSTGRES_DB SUPABASE_PUBLIC_URL; do
    val="$(grep "^${key}=" server/supabase/.env | cut -d= -f2- | tr -d "'\"" | head -1)"
    [[ -n "$val" ]] && patch_env "$COMPOSE_OUT" "$key" "$val"
  done
  ANON_KEY="$(grep '^ANON_KEY=' server/supabase/.env | cut -d= -f2- | tr -d "'\"")"
  patch_env "$COMPOSE_OUT" NEXT_PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY"
fi
if [[ -n "${DOCKER_USERNAME:-}" ]]; then
  patch_env "$COMPOSE_OUT" DOCKER_USERNAME "$DOCKER_USERNAME"
fi
if [[ -n "${DOCKER_TOKEN:-}" ]]; then
  patch_env "$COMPOSE_OUT" DOCKER_TOKEN "$DOCKER_TOKEN"
fi
echo "  wrote $COMPOSE_OUT"

for app in ryvo ryvo_admin; do
  ctpl="${VPS}/client/web/${app}/env.${ENV_NAME}.example"
  if [[ -f "$ctpl" ]]; then
    local_env="client/web/${app}/.env.local"
    apply_template "$ctpl" "$local_env"
    patch_env "$COMPOSE_OUT" "NEXT_PUBLIC_SUPABASE_URL" "$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$local_env" | cut -d= -f2-)"
    if [[ -f server/supabase/.env ]]; then
      ANON_KEY="$(grep '^ANON_KEY=' server/supabase/.env | cut -d= -f2- | tr -d "'\"")"
      patch_env "$local_env" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
      patch_env "$local_env" "NEXT_PUBLIC_FUNCTIONS_URL" "$(grep '^NEXT_PUBLIC_FUNCTIONS_URL=' "$COMPOSE_OUT" | cut -d= -f2-)"
    fi
  fi
done

if [[ -f server/supabase/.env ]]; then
  bash deploy/vps/scripts/write-web-env-production.sh "$ENV_NAME"
fi

echo "==> done"
