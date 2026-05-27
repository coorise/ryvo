#!/usr/bin/env bash
# Smoke test: request → driver offer → accept → dev payment → active trip
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/server/supabase/.env"
API="${RYVO_API:-http://localhost:8400/functions/v1}"

anon="$(grep -E '^ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')"
if [[ -z "$anon" ]]; then
  echo "ANON_KEY missing in $ENV_FILE"
  exit 1
fi

login() {
  local email="$1" pass="$2"
  curl -sS "${API%/functions/v1}/auth/v1/token?grant_type=password" \
    -H "apikey: $anon" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" | jq -r '.access_token'
}

client_token="$(login "client@ryvo-line.com" "Client@123")"
driver_token="$(login "driver@ryvo-line.com" "Driver@123")"

hdr_client=(-H "Authorization: Bearer $client_token" -H "apikey: $anon")
hdr_driver=(-H "Authorization: Bearer $driver_token" -H "apikey: $anon")

echo "1) Estimate fare..."
curl -sS "$API/trip-lifecycle/v1/estimate" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d '{"pickup_lat":48.8566,"pickup_lng":2.3522,"dropoff_lat":48.8738,"dropoff_lng":2.2950,"vehicle_category":"economy"}' | jq .

echo "2) Driver online..."
curl -sS "$API/location-ingest/v1/online" "${hdr_driver[@]}" \
  -H "Content-Type: application/json" \
  -d '{"is_online":true,"lat":48.8566,"lng":2.3522}' | jq .

idempotency="$(uuidgen)"
echo "3) Request ride..."
req_json="$(curl -sS "$API/trip-lifecycle/v1/trip/request" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"pickup_lat\":48.8566,\"pickup_lng\":2.3522,\"dropoff_lat\":48.8738,\"dropoff_lng\":2.2950,\"pickup_address\":\"Paris A\",\"dropoff_address\":\"Paris B\",\"vehicle_category\":\"economy\",\"idempotency_key\":\"$idempotency\"}")"
echo "$req_json" | jq .
request_id="$(echo "$req_json" | jq -r '.data.request.id // .request.id // empty')"
sleep 1

echo "4) Driver active request / assignment..."
status_json="$(curl -sS "$API/trip-lifecycle/v1/trip/active" "${hdr_driver[@]}")"
echo "$status_json" | jq .
assignment_id="$(echo "$status_json" | jq -r '.data.assignment.id // .data.request.active_assignment_id // .data.request.trip_assignments[0].id // empty')"

if [[ -z "$assignment_id" || "$assignment_id" == "null" ]]; then
  echo "No assignment yet — check matching worker / driver KYC / online status"
  exit 1
fi

echo "5) Driver accept ($assignment_id)..."
curl -sS -X POST "$API/trip-lifecycle/v1/assignment/$assignment_id/accept" "${hdr_driver[@]}" | jq .

echo "6) Payment intent..."
curl -sS "$API/payment-gateway/v1/intent" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$request_id\",\"idempotency_key\":\"$(uuidgen)\"}" | jq .

echo "7) Dev payment confirm..."
trip_json="$(curl -sS "$API/payment-gateway/v1/confirm-dev" "${hdr_client[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$request_id\"}")"
echo "$trip_json" | jq .
trip_id="$(echo "$trip_json" | jq -r '.data.trip_id // empty')"

if [[ -n "$trip_id" && "$trip_id" != "null" ]]; then
  echo "8) Chat message..."
  curl -sS -X POST "$API/trip-chat/v1/trip/$trip_id/messages" "${hdr_client[@]}" \
    -H "Content-Type: application/json" \
    -d '{"body":"Hello driver"}' | jq .
fi

echo "Done."
