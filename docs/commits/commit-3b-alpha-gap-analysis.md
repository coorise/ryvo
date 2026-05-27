# Checkpoint 3b — Alpha Backend Gap Analysis (Uber 80–90% Target)
**Date:** 2026-05-17
**Phase:** 3 (assessment)
**Status:** PARTIAL — foundation only; not alpha-complete for end-to-end ride UX

## Executive summary

Phase 3 delivered **infrastructure + API skeletons** (17 services, ABAC, PostGIS, Kafka/Redis hooks).  
It did **not** deliver a complete Uber-like **transactional ride flow** usable from mobile/web without further work.

**Rule of thumb:** DB + auth + admin RBAC ≈ **ready**. Ride marketplace UX ≈ **~35–45%** on backend; maps/chat/payment gating need Phase 3c.

---

## Feature matrix (your questions)

| Capability | Status | What exists today | What's missing |
|------------|--------|-------------------|----------------|
| Register / login | **Done** | Supabase Auth, `handle_new_user`, JWT ABAC hook | Email confirm flow tuning, phone OTP prod SMTP |
| Admin manage app | **Partial** | Roles, ban, KYC queue list, audit, coupons CRUD | Full dashboards APIs, analytics, live map, fare admin UI APIs |
| Driver presence (online) | **Done** | `location-ingest` online/offline + `driver_availability` | Foreground service = mobile (Phase 5) |
| Driver tariff / pricing | **Partial** | `price_configs` table, surge by geofence | Driver-facing tariff API, category fares, admin CRUD routes |
| Client place search + autocomplete | **Missing** | `routing-engine` geocode (address → coords) | Google Places Autocomplete API route, session tokens |
| Find drivers nearby | **Partial** | `match_drivers_for_request`, H3/PostGIS | Nearby preview before request, ETA on map, vehicle filters |
| Payment | **Partial** | Stripe intent + webhook scaffold | **Pay only after driver accepts**, saved cards, refunds flow |
| Client map: driver approaching | **Missing** (backend) | Realtime on `driver_availability` / `trips` tables | Trip channel `trip:{id}`, location broadcast per trip, polyline |
| Driver map: client location | **Partial** | Pickup geom on trip | Active trip pickup + live rider pin, navigation polyline |
| Driver accept/decline **before** payment | **Missing** | `trip_assignments` schema (`offered/accepted/rejected`) | Offer workflow, 30s timeout, block payment until accepted |
| Chat (driver ↔ client after booking) | **Missing** | `support-service` (support tickets only) | `trip_messages` table, Realtime channel, post-accept unlock |
| Rate driver / reviews | **Partial** | `ratings_reviews` table | POST/GET rating APIs, aggregate on profiles |
| Profile + comments (driver/client) | **Partial** | `rider_profiles`, `driver_profiles` | Public profile endpoints, review list, avatar URLs |
| Driver sees client phone/name/photo | **Partial** | Data in `auth.users` + profiles | Scoped API for active trip only (privacy/GDPR) |
| KYC (ID, selfie+ID, licence, bank) | **Partial** | Submit doc + admin approve/reject | Multi-doc types, required set, staff notifications, resubmit |
| Support / complaints | **Partial** | Tickets + messages | Staff queue notifications, categories, SLA |
| High load / low latency | **Partial** | Redis rate limits, indexes | Load tests, connection pooling tuning, caching |
| gRPC between services | **Not started** | HTTP + Kafka (per spec: defer) | Only if HTTP p99 insufficient |
| Multithreading | **N/A** | Bun async I/O | Worker scaling = horizontal replicas |

---

## Critical path flow (Uber) — current vs target

### Target (correct order)

```
1. Client: autocomplete pickup/dropoff → fare estimate
2. Client: request ride (idempotent) — NO payment yet
3. System: match → offer Driver A (push + Realtime)
4. Driver: accept | reject (30s)
   - reject → offer next driver or expire
5. Only if accepted → client checkout (Stripe)
6. Payment confirmed → trip active, chat unlocked
7. Both: Realtime GPS on trip channel + map polyline
8. Trip end → rating + receipt
```

### Current (simplified / wrong order)

```
1. Client: request ride → Kafka → match first driver → trip created immediately
2. Payment intent can be created independently
3. No accept/decline gate before payment
4. No trip chat
5. Map tracking = client must subscribe Realtime (not fully wired)
```

---

## Phase 3c — Backend alpha-complete (recommended order)

### P0 — Must have before web/mobile integration

1. **Offer & accept flow** (`matching-engine`, `trip-lifecycle`)
   - States: `pending → offered → accepted → payment_pending → paid → en_route → ...`
   - Reject/timeout → next driver or `expired`
   - `POST /trip-lifecycle/v1/assignment/:id/accept|reject`
2. **Payment gating** (`payment-gateway`)
   - `POST /payment/intent` requires `trip_assignment.status = accepted`
3. **Fare estimate** (`routing-engine` + `price_configs`)
   - `POST /routing-engine/v1/estimate` before request
4. **Places autocomplete** (`routing-engine`)
   - `GET /routing-engine/v1/places/autocomplete?q=`
5. **Trip Realtime** (`location-ingest`, Supabase Realtime)
   - Channel `trip:{trip_id}` for location + state
   - Admin channel `admin.drivers`
6. **Trip chat** (new `chat-service` or extend `support-service`)
   - Table `trip_messages`, Realtime, only when `trip.status >= paid`
7. **Ratings API** (`rating-service` or `trip-lifecycle`)
8. **Profile APIs** (scoped: trip participants + public driver card)
9. **KYC v2** — doc types enum, required checklist, staff notification

### P1 — Strong Uber parity

- Saved payment methods (Stripe Customer)
- Driver earnings + trip history pagination
- Cancellation fees / no-show
- Idempotency on all mutations
- Push notifications (FCM) via `notification-service`
- Coupon at checkout
- Ban appeal flow (schema exists)

### P2 — Scale & ops

- gRPC for location-ingest only (if benchmarks require)
- Bunqueue for offer timeouts (replace in-process cron)
- Load tests k6 (500 drivers, 100 concurrent requests)
- App Check / integrity on location + request

---

## Tables to add (SQL 010)

- `trip_messages` (trip_id, sender_id, body, created_at)
- `trip_offers` optional or use `trip_assignments` with strict state machine
- `kyc_documents` checklist per driver (doc_type, status, rejection_reason)
- `payment_methods` (stripe_customer_id, last4, brand)
- Extend `trip_requests` with `status` including `awaiting_driver_accept`, `awaiting_payment`

---

## What agent should do next

1. Implement Phase 3c P0 items (start with accept/decline + payment gate).
2. Write `commit-3c-ride-flow-alpha.md` when P0 passes curl E2E script.
3. Then Phase 4 web with React template + Maps + Realtime.

EOF
