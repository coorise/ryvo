#!/usr/bin/env bash
# Quick check that finance admin routes (including coupons) are registered in ryvo-gateway.
set -euo pipefail

API="${RYVO_API:-http://localhost:8400/functions/v1}"

check_route() {
  local path="$1"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$API/auth-hooks$path" -H "apikey: ${ANON_KEY:-}")"
  if [[ "$code" == "404" ]]; then
    echo "[verify-finance] FAIL $path -> 404 (route not registered; run: docker restart ryvo-functions)"
    return 1
  fi
  echo "[verify-finance] OK $path -> $code (expected 401 without token)"
}

check_route "/v1/admin/finance/referrals"
check_route "/v1/admin/finance/coupons"
check_route "/v1/admin/finance/tariffs"
check_route "/v1/admin/payments"
echo "[verify-finance] All finance routes reachable"
