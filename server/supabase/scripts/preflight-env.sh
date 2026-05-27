#!/usr/bin/env bash
# Ensure server/*/.env exist from .env.example (host bind-mount). Safe to re-run.
set -euo pipefail

WORKSPACE="${WORKSPACE:-/workspace}"
copy_if_missing() {
  local dir="$1"
  if [[ ! -f "${dir}/.env" && -f "${dir}/.env.example" ]]; then
    cp "${dir}/.env.example" "${dir}/.env"
    echo "[ryvo-preflight] created ${dir}/.env"
  fi
}

copy_if_missing "${WORKSPACE}/server/supabase"
copy_if_missing "${WORKSPACE}/server/kafka"
copy_if_missing "${WORKSPACE}/server/redis"
copy_if_missing "${WORKSPACE}/server/bunqueue"

env_file="${WORKSPACE}/server/supabase/.env"
if [[ -f "$env_file" ]] && grep -q '^POSTGRES_PASSWORD=' "$env_file"; then
  pw="$(grep '^POSTGRES_PASSWORD=' "$env_file" | cut -d= -f2- | sed "s/^['\"]//;s/['\"]$//")"
  enc="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$pw")"
  if grep -q '^POSTGRES_PASSWORD_URI_ENCODED=' "$env_file"; then
    sed -i "s|^POSTGRES_PASSWORD_URI_ENCODED=.*|POSTGRES_PASSWORD_URI_ENCODED=${enc}|" "$env_file"
  else
    echo "POSTGRES_PASSWORD_URI_ENCODED=${enc}" >> "$env_file"
  fi
  echo "[ryvo-preflight] POSTGRES_PASSWORD_URI_ENCODED set"
fi

echo "[ryvo-preflight] OK"
