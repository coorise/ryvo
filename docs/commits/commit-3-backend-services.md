# Checkpoint 3 — Backend Services (Bun Gateway + ABAC + Kafka/Redis)
**Date:** 2026-05-17
**Phase:** 3
**Status:** COMPLETE (foundation — refine per-service in follow-ups)

## What Was Done

### Architecture
- Replaced Deno edge-runtime dispatcher with **Bun `ryvo-gateway`** on port 9000 (Kong `/functions/v1/{service}/...`).
- Overlay: `server/supabase/docker-compose.ryvo.yml` — **`ryvo-functions`** Bun container with network alias `functions` (Kong routes unchanged). Stock Deno `functions` service disabled via profile `legacy-edge`.
- Shared library: `_shared/` (router, JWT+ABAC, Redis rate limit, Kafka, Supabase admin, audit/notification helpers).
- Background workers: Kafka consumers (matching, notifications, audit) + cron scheduler (stale drivers, idempotency TTL).

### SQL (`009_auth_hooks.sql`)
- `custom_access_token_hook` — injects `app_role`, `app_metadata.roles`, `app_metadata.permissions` into JWT.
- `handle_new_user` trigger — profiles + default role on signup.
- `match_drivers_for_request` — PostGIS driver matching for trip requests.
- Storage bucket `ryvo-storage`.

### Services (17) — HTTP routes under `/functions/v1/{service}/v1/...`

| Service | Key endpoints |
|---------|----------------|
| auth-hooks | Admin role assign/revoke, ban/unban, roles list |
| location-ingest | GPS ingest, online/offline |
| trip-lifecycle | Request ride, active trip, state transitions |
| matching-engine | Kafka consumer + internal match |
| routing-engine | Geocode, directions, ETA (Google Maps) |
| payment-gateway | Stripe intents + webhook |
| notification-service | Send, inbox, mark read |
| storage-service | Signed upload/read URLs |
| kyc-service | Submit, admin review queue |
| coupon-service | Validate, admin create |
| support-service | Tickets + messages |
| audit-service | Admin audit log read |
| geofence-service | Point-in-polygon, surge multiplier |
| shift-service | Driver clock in/out |
| payout-service | Driver payouts, admin batch |
| cron-jobs | Stale drivers, expire idempotency |
| gdpr-service | Export/delete requests |

### Admin ABAC
- Super admin / admin can assign roles (`staff`, `moderator`, etc.) via `POST /functions/v1/auth-hooks/v1/admin/roles/assign`.
- Permissions enforced via JWT claims from DB (`permissions` table).

## Apply / Restart

```bash
bash server/supabase/scripts/apply-seeds.sh   # runs 009 if added to loop
docker exec -i supabase-db psql -U postgres -d postgres < server/supabase/scripts/seeds/009_auth_hooks.sql
docker compose up -d --force-recreate functions
```

## Test

```bash
curl http://localhost:8400/functions/v1/auth-hooks/v1/health
curl http://localhost:8400/functions/v1/location-ingest/v1/health
# Authenticated routes need Bearer JWT from Supabase Auth login
```

## Env (server/supabase/.env)

- `SERVICE_HMAC_SECRET`, `GOOGLE_MAPS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## What Comes Next (Phase 4 — Web)

- Wire Next.js to Supabase client + JWT claims for ABAC guards.
- Port React template dashboards (admin/driver/client).

## Known Issues

- Matching is simplified (first nearby driver); production needs offer timeout + reassignment loop.
- Stripe webhook requires `STRIPE_WEBHOOK_SECRET` for signature verify.
- Google Maps routes return 503 if `GOOGLE_MAPS_API_KEY` empty (ETA uses fallback).
- Bunqueue TCP job enqueue from gateway not yet wired (cron uses in-process scheduler).
