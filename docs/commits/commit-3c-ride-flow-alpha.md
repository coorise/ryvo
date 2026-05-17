# Commit 3c — Ride flow alpha (backend)

Phase 3c completes the Uber-like ride lifecycle on the Bun gateway **before** web/mobile work.

## Flow (enforced)

1. Client estimates fare → requests ride  
2. Matching offers nearest online driver (30s timeout, re-offer on reject/timeout via cron)  
3. Driver accepts → request moves to `awaiting_payment`  
4. Client pays (Stripe intent or `POST payment-gateway/v1/confirm-dev` in non-production)  
5. Trip is created (`driver_en_route`), chat unlocks, live location broadcasts on `trip:{id}`  

Payment and trip creation **do not** happen until the driver accepts.

## SQL

| Seed | Purpose |
|------|---------|
| `010_ride_flow_alpha.sql` | Request statuses, `fare_breakdown`, `trip_messages`, `kyc_documents`, `expire_trip_offers()`, `pricing:manage` |
| `011_dev_kyc_documents.sql` | Approved KYC docs for drivers already marked `approved` (local/E2E) |

## Services (19 via `ryvo-gateway`)

| Service | New / updated capabilities |
|---------|---------------------------|
| `trip-lifecycle` | Estimate, request + sync match, accept/reject, driver `trip/active`, transitions, rating |
| `matching-engine` | Offer-only (no trip until payment) |
| `payment-gateway` | Intent gated on accept; webhook → `createTripAfterPayment`; dev confirm |
| `routing-engine` | Places autocomplete, nearby drivers, estimate |
| `location-ingest` | KYC gate on go-online; trip location realtime |
| `trip-chat` | Messages after trip exists |
| `profile-service` | `/me`, public driver profile, trip counterparty |
| `kyc-service` | Multi-doc checklist, staff queue, per-doc review |
| `geofence-service` | Admin tariff CRUD |
| `cron-jobs` | `expire-offers` every 15s (re-offer next driver) |
| `support-service` | Staff notification on new tickets |

Shared: `_shared/lib/trip-flow.ts`, `fare.ts`, `realtime.ts`.

## Infra fix

`POSTGRES_PASSWORD` values containing `@` (e.g. `Admin@123`) must use `POSTGRES_PASSWORD_URI_ENCODED` in DB URIs (`docker-compose.yml`). `scripts/ensure-env.sh` generates this automatically.

## Portable start (team)

```bash
cp server/supabase/.env.example server/supabase/.env   # first time only
# or: bash scripts/ensure-env.sh
docker compose up -d
```

On every `ryvo-functions` start, **idempotent migrations** run (`ryvo.schema_migrations` checksum). SQL files are re-applied only when changed. Demo users are seeded once.

```bash
docker compose --profile smoke run --rm ryvo-smoke   # in-network E2E
bash scripts/e2e-ride-flow.sh                      # from host
```

Base URL: `http://localhost:8400/functions/v1/{service}/v1/...`

## Still deferred (Phase 4+)

- gRPC sidecars  
- Full Stripe webhook in CI  
- Next.js / Flutter clients  
- Production hardening (idempotency store, dispute flows, full payout automation)
