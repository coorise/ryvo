# Commit 7 — Admin Settings hub (tabbed profile, general, payment, mail, notifications)

**Date:** 2026-05-19  
**Branch:** `dev`  
**Status:** COMPLETE — rolled into `commit-8-admin-settings-nav-finance.md` with nav/finance work

## Summary

Replaced the single-form `/admin/settings` page with a **Staff-style tab layout**:

| Tab | Visibility | Purpose |
|-----|------------|---------|
| Profile | All admin users | Edit own photo, name, username, contact, address |
| General | `settings:read` | Platform prefs (app name, TZ, maintenance, ride defaults) |
| Payment | `settings:payment:read` | Stripe mode, fees, fares, payout delay |
| Mail | `settings:mail:read` or `email:templates` | Dynamic email templates |
| Notifications | `settings:notifications:read` | Per-event channel + audience routing |

Settings nav link is visible to **any** user with admin dashboard access (profile always reachable).

## Permissions (seed `018`)

- `settings:payment:read` / `settings:payment:update`
- `settings:mail:read` / `settings:mail:update`
- `settings:notifications:read` / `settings:notifications:update`

Existing: `settings:read`, `settings:update`, `email:templates`.

Grant new perms to roles via Staff → Permissions matrix after migration.

## Database

- `user_profiles`: username, display_name, phone, address_*, avatar_url, locale, bio
- `payment_settings` (singleton jsonb)
- `notification_settings` (singleton jsonb with event rules)
- Email templates: `driver_welcome`, `ride_receipt`, `order_success`

## API (`auth-hooks`)

| Method | Path | Auth |
|--------|------|------|
| GET/PATCH | `/v1/me/profile` | JWT (self) |
| GET/PATCH | `/v1/admin/settings` | `settings:read` / `settings:update` |
| GET/PATCH | `/v1/admin/settings/payment` | `settings:payment:*` |
| GET/PATCH | `/v1/admin/settings/notifications` | `settings:notifications:*` |
| GET/PUT | `/v1/admin/email-templates` | `settings:mail:*` or `email:templates` |

## Web

```
client/web/ryvo/src/app/admin/settings/page.tsx
client/web/ryvo/src/components/admin/settings/*
client/web/ryvo/src/services/settings.service.ts
client/web/ryvo/src/lib/admin-settings-url.ts
```

`canViewSettingsTab` / `canEditSettingsTab` in `guards/abac.ts`.

## Migrate

```bash
docker exec ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
docker restart ryvo-functions
```

Staff must **sign out/in** after permission changes.

## Next

- Avatar upload via Storage (URL-only today)
- Wire notification rules into `notification-consumer`
- i18n de/es/zh for `settingsHub.*`
