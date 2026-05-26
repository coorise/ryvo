#!/usr/bin/env bash
# Authenticated admin API smoke — run from host against Kong.
set -euo pipefail

API="${RYVO_API:-http://localhost:8400/functions/v1}"
AUTH_BASE="${RYVO_AUTH:-http://localhost:8400}"
ANON="${ANON_KEY:?ANON_KEY required}"

TOKEN=$(curl -sS "${AUTH_BASE}/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"admin@ryvo-line.com","password":"Admin@123"}' | jq -r '.access_token // empty')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "[admin-smoke] FAIL login"
  exit 1
fi

hdr=(-H "Authorization: Bearer $TOKEN" -H "apikey: $ANON")
fail=0

check() {
  local svc="$1" path="$2" extra="${3:-}"
  local url="$API/$svc$path$extra"
  local code
  code=$(curl -s -o /tmp/ryvo_smoke.json -w "%{http_code}" "${hdr[@]}" "$url")
  if [[ "$code" == "200" ]]; then
    echo "[admin-smoke] PASS $svc$path"
  else
    echo "[admin-smoke] FAIL $code $svc$path"
    head -c 300 /tmp/ryvo_smoke.json
    echo
    fail=1
  fi
}

check auth-hooks /v1/admin/rbac/me
check auth-hooks /v1/admin/roles
check auth-hooks /v1/admin/permissions
check audit-service /v1/admin/dashboard
check audit-service "/v1/admin/analytics" "?period=7d&audience=all"
check profile-service /v1/admin/settings
check profile-service "/v1/admin/users" "?kind=staff"
check trip-lifecycle "/v1/admin/trips" "?limit=5"
check payment-gateway "/v1/admin/payments" "?limit=5"
check payment-gateway /v1/admin/settings/payment
check payout-service /v1/admin/finance/tariffs
check payout-service /v1/admin/finance/paychecks
check payout-service /v1/admin/finance/checkouts
check payout-service /v1/admin/finance/tariff-subscriptions
check payout-service /v1/admin/finance/driver-earnings
check payout-service /v1/admin/finance/referrals
check coupon-service /v1/admin/finance/coupons
check notification-service /v1/admin/communication/messages
check notification-service /v1/admin/settings/notifications
check notification-service /v1/admin/email-templates
check support-service /v1/tickets
check support-service "/v1/admin/feedbacks/analytics" "?category=product&granularity=month"
check cron-jobs /v1/admin/settings/tasks
check kyc-service /v1/admin/drivers
check routing-engine /v1/admin/map/online-drivers

if [[ "$fail" -ne 0 ]]; then
  echo "[admin-smoke] FAILED"
  exit 1
fi
echo "[admin-smoke] ALL PASS"
