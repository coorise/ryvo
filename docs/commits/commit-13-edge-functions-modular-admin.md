# Commit 13 — Edge functions modular split & admin multi-service wiring

## Summary

Splits the former **auth-hooks monolith** into **19 domain-owned Bun services** behind `ryvo-gateway`, each with draft-compliant `src/api/<module>/{controller,service,validator,route,index}.ts` layout. Rewires **`client/web/ryvo`** admin services to call the owning gateway service (not `auth-hooks` for domain APIs). Adds **Live Map** and **Rides** admin pages backed by `routing-engine` and `trip-lifecycle`.

## Service ownership (admin)

| Admin area | Gateway service | Key routes |
|------------|-----------------|------------|
| RBAC, password reset | **auth-hooks** | `/v1/admin/rbac/me`, `/v1/admin/roles`, `/v1/admin/permissions`, `/v1/admin/users/:id/email-verified` |
| Users, platform settings | **profile-service** | `/v1/admin/users`, `/v1/admin/settings`, `/v1/settings/public` |
| Dashboard, analytics, security logs | **audit-service** | `/v1/admin/dashboard`, `/v1/admin/analytics`, `/v1/logs`, `/v1/security/*` |
| Notifications, campaigns, email templates | **notification-service** | inbox, `/v1/admin/communication/messages`, `/v1/admin/email-templates`, `/v1/admin/settings/notifications` |
| Tickets, feedback analytics | **support-service** | `/v1/admin/tickets`, `/v1/admin/feedbacks/analytics` |
| Scheduled tasks | **cron-jobs** | `/v1/admin/settings/tasks`, `/v1/run/admin-tasks` |
| Coupons | **coupon-service** | `/v1/admin/finance/coupons` (+ validate/redeem) |
| Finance (referrals, tariffs, paychecks, checkouts, earnings) | **payout-service** | `/v1/admin/finance/*` (except coupons) |
| Payments, payment settings | **payment-gateway** | `/v1/admin/payments`, `/v1/admin/settings/payment` |
| Trips (admin list + ride flow) | **trip-lifecycle** | `/v1/admin/trips`, trip lifecycle core |
| Drivers / KYC | **kyc-service** | `/v1/admin/drivers` |
| Live map, Places/routes | **routing-engine** | `/v1/admin/map/online-drivers`, `/v1/admin/map/search` |
| GPS ingest | **location-ingest** | driver location ingest |
| Geofence / surge / admin pricing | **geofence-service** | `/v1/admin/pricing` |

See **`docs/devs/edge-functions-services.md`** for layout, env, and migration scripts.

## Client service map

| File | Base service |
|------|----------------|
| `rbac.service.ts`, `auth-password.service.ts` | `auth-hooks` (+ `apiRequest` to `profile-service` for users ban/unban/CRUD) |
| `admin.service.ts` | `audit-service`, `profile-service`, `trip-lifecycle`, `payment-gateway` |
| `finance.service.ts` | `payout-service` + `coupon-service` for coupons |
| `settings.service.ts` | `profile-service`, `payment-gateway`, `notification-service` |
| `map.service.ts`, `routing.service.ts` | `routing-engine` |
| `tasks.service.ts` | `cron-jobs` (was documented as auth-hooks in commit-12) |
| `messages.service.ts`, `notification.service.ts` | `notification-service` |
| `support.service.ts`, `feedbacks.service.ts` | `support-service` |
| `drivers.service.ts`, `kyc.service.ts` | `kyc-service` |
| `audit.service.ts` | `audit-service` |

## Server layout

- Gateway: `server/supabase/volumes/functions/ryvo-gateway/index.ts`
- Per service: `src/handler.ts` → `src/api/routes.ts` merges module `route.ts` files
- Scripts: `scripts/migrate-distribute.py`, `restore-from-git-handler.py`, `scaffold-full-architecture.py`, route repair helpers
- **Fix (review):** corrupted `route.ts` files from scaffold/repair — wrong method/path/handler pairings broke admin APIs until restored:
  - `auth-hooks/.../admin-rbac/route.ts` (RBAC)
  - `profile-service/.../settings-platform/route.ts` (platform settings)
  - `payout-service/.../admin-finance-{tariffs,paychecks,checkouts,subscriptions}/route.ts` (finance)
  - `payment-gateway/.../settings-payment/route.ts`
  - `notification-service/.../settings-notifications`, `admin-email-templates/route.ts`
- **Added:** `support-service/.../admin-tickets` (`POST /v1/admin/tickets`), `PATCH /v1/tickets/:ticket_id` in core
- **Fix:** `matching-engine/src/handler.ts` re-exports `processRideRequest` (gateway crash without it)
- **Verify:** `server/supabase/scripts/admin-api-smoke.sh` — 25 authenticated admin endpoints → 200

## Google Maps

- Backend: `GOOGLE_MAPS_API_KEY` → `ryvo-functions` (`docker-compose.ryvo.yml`)
- Frontend: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `client/web/ryvo/.env.local`
- Docs: `docs/project/how_to_setup_gmaps.md`

## Admin UI (high level)

- **Live Map** (`/admin/map`): online drivers, place search, realtime-friendly list
- **Rides** (`/admin/rides`): trip list from `trip-lifecycle`
- Communication / HR / Settings / Advanced nav from commit-12 retained; tasks panel calls **cron-jobs**

## Verification

```bash
# Restart after volume changes
docker restart ryvo-functions

# Health (expect 200)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8400/functions/v1/audit-service/v1/health

# Admin routes without token (expect 401 = route registered)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8400/functions/v1/auth-hooks/v1/admin/rbac/me
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8400/functions/v1/audit-service/v1/admin/dashboard

# Client build
cd client/web/ryvo && bun run build
```

## Ops

```bash
docker compose -f server/supabase/docker-compose.yml -f server/supabase/docker-compose.ryvo.yml up -d ryvo-functions
docker exec -e SEEDS_DIR=/opt/ryvo/seeds ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
```

## Notes / next

- Many **core/legacy** modules keep handler logic in `route.ts` with thin controllers (stable restore from git); incremental extraction to controller/service is optional.
- **HTTP admin tasks** MVP allowlist remains `cron-jobs/*`; expand via dedicated runner when needed.
- Mobile/driver apps still use trip/matching services; admin path is production-ready for back-office.
