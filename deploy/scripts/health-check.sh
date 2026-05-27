#!/usr/bin/env bash
# Smoke test edge + auth login. Usage: bash deploy/scripts/health-check.sh [dev|prod|local]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ENV_NAME="${1:-dev}"
case "$ENV_NAME" in
  local)
    ADMIN_PORT=3200 CLIENT_PORT=3300 API_PORT=8400
    COMPOSE_ENV=""
    ;;
  dev)
    ADMIN_PORT=3400 CLIENT_PORT=3500 API_PORT=8500
    COMPOSE_ENV="deploy/compose/.env.dev"
    ;;
  prod)
    ADMIN_PORT=3200 CLIENT_PORT=3300 API_PORT=8400
    COMPOSE_ENV="deploy/compose/.env.prod"
    ;;
  *) echo "Usage: $0 [dev|prod|local]"; exit 1 ;;
esac

# shellcheck source=/dev/null
[[ -n "$COMPOSE_ENV" && -f "$COMPOSE_ENV" ]] && source "$COMPOSE_ENV"
[[ -f server/supabase/.env ]] && source server/supabase/.env

API_BASE="http://127.0.0.1:${API_PORT}"
ADMIN_URL="http://127.0.0.1:${ADMIN_PORT}"
CLIENT_URL="http://127.0.0.1:${CLIENT_PORT}"

fail=0
check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" || echo "000")
  if [[ "$code" == "$expect" || "$code" =~ ^${expect}$ ]]; then
    echo "  OK  $name ($code) $url"
  else
    echo "  FAIL $name (got $code, want $expect) $url"
    fail=1
  fi
}

echo "==> health-check ($ENV_NAME)"
check "admin web" "$ADMIN_URL/" "200"
check "client web" "$CLIENT_URL/" "200"
check "auth health" "$API_BASE/auth/v1/health" "401"

ANON="${ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
if [[ -z "$ANON" ]]; then
  echo "  SKIP login (ANON_KEY missing)"
else
  resp=$(curl -sS "$API_BASE/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d '{"email":"admin@ryvo-line.com","password":"Admin@123"}' || true)
  token=$(echo "$resp" | jq -r '.access_token // empty' 2>/dev/null || true)
  if [[ -n "$token" && "$token" != "null" ]]; then
    echo "  OK  admin login (access_token received)"
  else
    echo "  FAIL admin login: $resp"
    fail=1
  fi
fi

if [[ "$fail" -eq 0 ]]; then
  echo "==> all checks passed"
else
  echo "==> some checks failed"
  exit 1
fi
