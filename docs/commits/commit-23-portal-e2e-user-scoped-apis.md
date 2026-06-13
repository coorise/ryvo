# Commit 23 — Portal e2e: user-scoped APIs + ride workflow

## Backend

User-scoped endpoints (no admin permissions required):

| Service | Endpoint | Purpose |
|---------|----------|---------|
| trip-lifecycle | `GET /v1/me/trips` | Trip/request history for current user |
| payment-gateway | `GET /v1/me/payments` | Payment intents (client) or payouts (driver) |
| audit-service | `GET /v1/me/activity` | Own activity logs |
| audit-service | `GET /v1/me/security/auth-events` | Own security events |
| audit-service | `GET /v1/me/security/devices` | Own devices |
| audit-service | `POST /v1/me/security/devices/:id/revoke` | Revoke own device |
| routing-engine | `GET /v1/map/nearby-drivers` | Client/driver map (online drivers) |
| routing-engine | `GET /v1/map/search` | Place search for portals |

Shared helpers in `_shared/lib/portal-data.ts`.

## Frontend (`client/web/ryvo`)

- **`trip.service`**, **`payment.service`**, **`trip-chat.service`** — ride lifecycle + ephemeral chat
- **`portal.service`** — uses `/v1/me/trips` and `/v1/me/payments`
- **`PortalRideWorkflowPanel`** — book / request / accept / pay / drive tabs on live map
- **`LiveMapPanel`** `apiScope="portal"` for nearby drivers + map search
- **`PortalEphemeralChatPanel`** — active-trip messages via trip-chat API
- **`PortalDriverKycPanel`** — driver checklist via `/v1/checklist`
- **`PortalAnalyticsPanel`** — stats from own trip history
- **`PortalPathGuard`** — ABAC path blocking (mirrors admin)
- Audit panels use `/v1/me/*` in portal variant

## Ride flow (alpha)

Client: set pickup/dropoff → request → awaiting driver → pay → active trip  
Driver: incoming offer → accept/reject → trip state transitions

## Still TODO

- KYC document upload UI, driver messages campaigns, counterparty profile pages
- Feedbacks submit/view (still admin analytics API)
- Full map place picker wired to booking form (demo coords for now)
- Stripe checkout UI after payment intent
