#!/usr/bin/env bash
# Merge deploy templates into runtime .env files (server/*, compose, client).
# Usage: bash deploy/scripts/apply-env.sh dev|prod
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "dev" && "$ENV_NAME" != "prod" ]]; then
  echo "Usage: $0 dev|prod"
  exit 1
fi

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
  base_deploy="deploy/server/${mod}/env.example"
  overlay="deploy/server/${mod}/env.${ENV_NAME}.example"
  if [[ "$mod" != "supabase" && -f "$base_deploy" ]]; then
    cp -n "server/${mod}/.env.example" "$target" 2>/dev/null || cp "server/${mod}/.env.example" "$target"
    apply_template "$base_deploy" "$target"
  fi
  apply_template "$overlay" "$target"
done

if [[ -f server/supabase/.env ]]; then
  sed -i '/^KONG_HTTP_PORT=/d;/^KONG_HTTPS_PORT=/d' server/supabase/.env
fi

COMPOSE_EX="deploy/compose/env.${ENV_NAME}.example"
COMPOSE_OUT="deploy/compose/.env.${ENV_NAME}"
cp "$COMPOSE_EX" "$COMPOSE_OUT"
ANON_KEY="$(grep '^ANON_KEY=' server/supabase/.env | cut -d= -f2- | tr -d "'\"")"
patch_env "$COMPOSE_OUT" NEXT_PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY"
echo "  wrote $COMPOSE_OUT"

for app in ryvo ryvo_admin; do
  ctpl="deploy/client/web/${app}/env.${ENV_NAME}.example"
  if [[ -f "$ctpl" ]]; then
    apply_template "$ctpl" "client/web/${app}/.env.local"
    patch_env "$COMPOSE_OUT" "NEXT_PUBLIC_SUPABASE_URL" "$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "client/web/${app}/.env.local" | cut -d= -f2-)"
  fi
done

echo "==> done"
