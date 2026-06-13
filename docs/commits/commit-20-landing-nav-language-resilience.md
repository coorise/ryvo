# Commit 20 — Landing UX, language localStorage, gateway resilience

## Client / admin UX

- Landing `SiteHeader`: real `LanguageSwitcher` (was a link to login); `localStorage` (`ryvo.lang`) always wins over server default.
- Logo → `/landing`; sidebar **home** icon → dashboard (`/admin`, `/client`, `/driver`).
- Logged-in landing shows **Go to dashboard** instead of Sign in.
- `#safety` section implemented; cities use `LANDING_CITIES` with Unsplash images from product template.

## API 503 mitigation

- Deploy warmup hits `profile-service/v1/settings/public` (client boot) plus admin paths.
- Health-check requires settings/public → 200.
- `I18nProvider` retries 503/502 on platform settings fetch (client + admin).

## Deploy

Push `dev` → CI builds web images + functions, blue/green deploy on VPS.
