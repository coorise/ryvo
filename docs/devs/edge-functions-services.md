# Edge functions — service ownership & layout

Each folder under `server/supabase/volumes/functions/<service>/` is an independent Bun service in `ryvo-gateway/index.ts`.  
Kong: `/functions/v1/<service>/v1/...`

## Mandatory layout (draft-instructions)

```
<service>/
  index.ts                 # optional: startServer() when run standalone
  src/
    index.ts               # export handle, startServer
    handler.ts             # gateway re-export
    configs/               # const.ts, env.ts, index.ts
    core/
      common/index.ts
      server/bootstrap.ts  # Bun.serve({ fetch: handle })
    lib/bun/index.ts         # re-export shared Bun wrapper
    services/index.ts      # external clients (Stripe, etc.)
    types/index.ts
    api/
      routes.ts            # createServiceRouter + merge modules
      deps.ts              # shared imports for modules
      index.ts
      health/              # controller, service, validator, route, index
      <domain>/            # same 5 files per API group
    schemas/validators.ts  # when needed
```

## Service ownership (admin)

| Service | Responsibility |
|---------|----------------|
| **auth-hooks** | RBAC, password reset, email verification hooks, internal signup/sign-in, admin email-verified override |
| **profile-service** | `/v1/me/profile`, admin users, public platform settings |
| **audit-service** | Security logs, dashboard, analytics |
| **notification-service** | Inbox, send, campaigns, email templates, notification settings |
| **support-service** | Tickets + feedback analytics |
| **cron-jobs** | Cron runners + admin scheduled tasks |
| **coupon-service** | Coupons validate/redeem + admin coupon CRUD |
| **payout-service** | Finance admin (referrals, tariffs, paychecks, subscriptions, checkouts, earnings) + driver payout batch |
| **payment-gateway** | Stripe intents + admin payments + payment settings |
| **trip-lifecycle** | Trip flow + admin trips list |
| **kyc-service** | Driver KYC + admin drivers |
| **routing-engine** | Google Places/routes/geocode + admin live map |
| **location-ingest** | Driver GPS ingest |
| **geofence-service** | Geofence, surge, admin pricing |
| **gdpr-service** | GDPR export/delete requests |

## Google Maps

- Backend: `GOOGLE_MAPS_API_KEY` in `server/supabase/.env` → `ryvo-functions` container (`docker-compose.ryvo.yml`).
- Frontend: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `client/web/ryvo/.env.local`.
- See `docs/project/how_to_setup_gmaps.md`.

## Client

Admin `*.service.ts` files call the **owning** service name (not `auth-hooks` for domain APIs).  
Example: `finance.service.ts` → `payout-service` / `coupon-service`; `map.service.ts` → `routing-engine`.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/migrate-distribute.py` | Move routes from auth-hooks monolith to owners |
| `scripts/restore-from-git-handler.py` | Restore `core`/`legacy` routes from git `handler.ts` |
| `scripts/scaffold-full-architecture.py` | Add configs/core/health skeleton (does not split handlers) |
| `scripts/fix-route-closing-braces.py` | Repair route `},` after handler lines |

## Smoke (local)

```bash
cd server/supabase/volumes/functions
bun -e "import { handle } from './auth-hooks/src/api/routes.ts';
const r = await handle(new Request('http://x/auth-hooks/v1/health'));
console.log(r.status);"
```

Restart stack after changes: `docker compose -f server/supabase/docker-compose.ryvo.yml up -d ryvo-functions`
