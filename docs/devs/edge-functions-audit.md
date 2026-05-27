# Ryvo edge functions — honest audit (2026-05-27)

This document reflects what is **actually implemented** under `server/supabase/volumes/functions/`, not only `/v1/health`.

Gateway entry: `ryvo-gateway/index.ts` (Bun on port 9000, Kong `/functions/v1/{service}/...`).

## Legend

| Status | Meaning |
|--------|---------|
| **Production** | Real DB/business logic, used in E2E or admin flows |
| **Partial** | Works but simplified (e.g. fare math, payout batch) |
| **Internal** | Service-signed cron/internal only |
| **Stub** | Health (+ maybe 1 route) only |

## Per-service

| Service | Routes (beyond health) | Status | Client wiring |
|---------|------------------------|--------|---------------|
| **auth-hooks** | Admin RBAC, users, drivers, finance, map, trips, settings, auth | **Production** | `admin.service`, `map.service`, `finance.service`, etc. |
| **trip-lifecycle** | Request, accept/reject, active trip, transitions, rate | **Production** | Mobile/web ride flows (E2E smoke) |
| **location-ingest** | GPS ingest, driver online | **Production** | Driver app (not all admin UI) |
| **matching-engine** | Internal match (`SERVICE_HMAC`) | **Production** | Kafka consumer → internal |
| **routing-engine** | Autocomplete, place details, nearby, estimate, geocode, directions | **Production** | `routing.service` (admin map autocomplete) |
| **payment-gateway** | Stripe intent, webhook, dev confirm | **Production** | Checkout E2E |
| **trip-chat** | Trip messages | **Production** | Trip chat UI (when built) |
| **kyc-service** | Checklist, submit, review queue | **Production** | `kyc.service`, admin KYC |
| **support-service** | Tickets, messages, admin tickets | **Production** | `support.service` |
| **notification-service** | Send, inbox | **Production** | `notification.service` |
| **storage-service** | Signed upload/read | **Production** | `storage.service` |
| **audit-service** | Activity + security logs | **Production** | `audit.service` |
| **coupon-service** | Validate/redeem | **Production** | Finance/checkout |
| **geofence-service** | Point-in-fence, surge, admin pricing | **Partial** | Not all admin UI |
| **shift-service** | Clock in/out | **Partial** | Driver payroll path |
| **profile-service** | Me, public driver, counterparty | **Partial** | Overlaps auth-hooks `/v1/me/profile` |
| **payout-service** | List payouts, batch (simplified gross) | **Partial** | Admin finance (limited) |
| **gdpr-service** | Export/delete request | **Partial** | User settings (basic export) |
| **cron-jobs** | stale-drivers, expire-offers, expire-idempotency, admin-tasks | **Production** | Scheduler + Bunqueue worker |
| **main** | Legacy hello | **Stub** | Unused (gateway uses `ryvo-gateway`) |

## Background workers (`_shared/workers/`)

| Worker | Role |
|--------|------|
| `cron-scheduler` | Enqueues or dispatches cron ticks |
| `bunqueue-cron-worker` | Pulls `ryvo-cron` queue on Bunqueue HTTP (6790), runs signed cron routes |
| `matching-consumer` | Kafka → matching-engine |
| `notification-consumer` | Kafka → notifications |
| `audit-consumer` | Kafka → audit |
| `email-worker` | SMTP outbox |

## Bunqueue integration

- Docker: `server/bunqueue` (HTTP **6790**, TCP 6789).
- Env on `ryvo-functions`: `BUNQUEUE_HTTP_BASE_URL`, `USE_BUNQUEUE_CRON=true`.
- Flow: scheduler → `POST /queues/ryvo-cron/jobs` → worker pull → `cron-jobs/v1/run/*` (same handlers as before).
- Fallback: direct signed HTTP if Bunqueue is down.

## Gaps vs draft (intentional backlog)

- Maps **provider abstraction** (Google default + Valhalla fallback) — only Google wired today.
- **H3 dispatch** at scale — H3 on ingest; matching still RPC-based.
- **Full ride admin** (cancel modal, export, live trip detail) — trips list only.
- **Driver/client live map** apps — admin map only.
- **Observability** page — not wired to Prometheus/Grafana yet.

## How to verify locally

```bash
# All health
for s in auth-hooks trip-lifecycle routing-engine cron-jobs; do
  curl -s -o /dev/null -w "$s %{http_code}\n" "http://localhost:8400/functions/v1/$s/v1/health"
done

# E2E trip smoke
cd server/supabase && RYVO_API=http://localhost:8400/functions/v1 ANON_KEY=... bash scripts/run-e2e-smoke.sh

# Bunqueue health (if stack up)
curl -s http://localhost:6790/health
```
