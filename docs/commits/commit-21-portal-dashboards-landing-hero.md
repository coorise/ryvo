# Commit 21 — Portal dashboards + landing hero auth CTAs

## Landing

- Hero section uses `LandingHeroActions`: logged-in users see **Go to dashboard** + **Go home** (matches navbar).
- `export const dynamic = "force-dynamic"` on client/admin landing pages so local dev does not serve stale prerendered HTML.

## Driver / client portals

- Replaced `PortalPlaceholder` scaffolds with real panels reusing admin UI:
  - Notifications inbox, activity/security logs (self-scoped), analytics (audience locked), payments, rides, live map tabs, KYC (driver), counterparties, feedbacks, chat support, ephemeral chat, messages (driver).
- Overview home pages link to main sections.
- Settings: profile + configurations (language via `/v1/me/profile`, payment/notifications shortcuts).

## Admin panels

- `ActivityLogsPanel`, `SecurityAuthLogsPanel`, `SecurityDevicesPanel` accept `variant="portal"` (no RBAC gate, filter to current user).
- `AnalyticsDashboard` supports `lockedAudience` for portal.

## Services

- `portal.service.ts` — active trip + trip/payment list helpers.
- `supportService.createTicket` for user support tickets.
