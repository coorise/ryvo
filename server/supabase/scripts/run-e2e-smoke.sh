#!/usr/bin/env bash
# In-container E2E smoke (optional compose profile: smoke)
set -euo pipefail

API="${RYVO_API:-http://kong:8000/functions/v1}"
ANON="${ANON_KEY:?ANON_KEY required}"

login() {
  curl -sS "${API%/functions/v1}/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r '.access_token'
}

client_token="$(login "client@ryvo-line.com" "Client@123")"
driver_token="$(login "driver@ryvo-line.com" "Driver@123")"

hdr_client=(-H "Authorization: Bearer $client_token" -H "apikey: $ANON")
hdr_driver=(-H "Authorization: Bearer $driver_token" -H "apikey: $ANON")

curl -sf "$API/trip-lifecycle/v1/health" >/dev/null
curl -sf "$API/location-ingest/v1/online" "${hdr_driver[@]}" \
  -H "Content-Type: application/json" \
  -d '{"is_online":true,"lat":48.8566,"lng":2.3522}' | jq -e '.data.is_online == true' >/dev/null

idempotency="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen)"
req_json="$(curl -sS "$API/trip-lifecycle/v1/trip/request" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"pickup_lat\":48.8566,\"pickup_lng\":2.3522,\"dropoff_lat\":48.8738,\"dropoff_lng\":2.2950,\"pickup_address\":\"A\",\"dropoff_address\":\"B\",\"vehicle_category\":\"economy\",\"idempotency_key\":\"$idempotency\"}")"

request_id="$(echo "$req_json" | jq -r '.data.request.id')"
assignment_id="$(curl -sS "$API/trip-lifecycle/v1/trip/active" "${hdr_driver[@]}" | jq -r '.data.assignment.id')"

[[ -n "$assignment_id" && "$assignment_id" != "null" ]] || {
  echo "E2E failed: no driver assignment"
  exit 1
}

curl -sS -X POST "$API/trip-lifecycle/v1/assignment/$assignment_id/accept" "${hdr_driver[@]}" | jq -e '.data.proceed_to_payment' >/dev/null
curl -sS "$API/payment-gateway/v1/intent" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$request_id\",\"idempotency_key\":\"$(uuidgen)\"}" | jq -e '.data.intent.id' >/dev/null

trip_id="$(curl -sS "$API/payment-gateway/v1/confirm-dev" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$request_id\"}" | jq -r '.data.trip_id')"

[[ -n "$trip_id" && "$trip_id" != "null" ]] || {
  echo "E2E failed: trip not created"
  exit 1
}

echo "[ryvo-smoke] PASS trip_id=$trip_id"
