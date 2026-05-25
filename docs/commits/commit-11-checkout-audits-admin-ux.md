# Commit 11 — Checkout funnel, tariff max withdraw, audits & admin list UX

## Summary

Extends admin finance and audits to match the Users-style list layout: checkout funnel with delete and abandoned recovery reminders, tariff max withdrawal cap, sidebar **Clients** label, and Security logs (Auth + Devices tabs) plus Activity logs.

## Tariff — max withdrawal

| Seed | Purpose |
|------|---------|
| `030_max_withdraw_amount.sql` | `max_withdraw_amount` on `driver_tariff_packages` (NULL = unlimited) |

- Form: min/max withdraw in Payout & timing; unlimited toggle for max.
- API: `finance.service` map/body, handler schema, `finance-driver-earnings` enforces cap on queue paycheck.

## Checkout funnel (admin)

- **Page:** `AdminPageHeader` + `CheckoutsPanel` (stats, search, filters, table/grid, pagination).
- **Actions:** view preview; **delete** session (`DELETE /v1/admin/finance/checkouts/:id`); **recovery reminder** for abandoned (textarea, email/push toggles, delay timer).
- **Backend:** `finance-checkouts.ts`, `031_checkout_reminders.sql`, custom email body in notification consumer.
- **Permission:** `finances:checkouts:update` (delete + schedule reminder).
- **Components:** `checkout-preview-dialog.tsx`, `checkout-recovery-dialog.tsx`.
- **Fix:** `BellRing` import in `admin-list-ui.tsx` for remind action.

## Nav / clients

- Sidebar and clients list title: **Users** → **Clients** (`nav.users` in en/fr/de/es/zh).

## Audits — Security logs (`/admin/security`)

| Seed | Purpose |
|------|---------|
| `032_security_audit_devices.sql` | `security_auth_events`, extended `device_tokens`, `audit:update` |

- **Tabs:** Auth logs | Devices logs (`security-tabs.tsx`).
- **Auth logs:** severity stats, search, severity filter, table (time, severity, type, actor, IP/country, MFA, details); demo events seeded.
- **Devices logs:** user devices table; **revoke** (`POST /v1/security/devices/:id/revoke`); audit + security event on revoke.
- **API:** `admin-security.ts`, extended `audit-service` handler routes.

## Audits — Activity logs (`/admin/audit`)

- **Activity logs panel:** staff/system actions from `audit_logs` (excludes security auth event types).
- Category filter: users, drivers, finance, admin, other.

## API surface (audit-service)

- `GET /v1/logs` — activity logs (filtered)
- `GET /v1/security/auth-events`
- `GET /v1/security/devices`
- `POST /v1/security/devices/:id/revoke`

## Web components (new)

- `components/admin/audit/security-tabs.tsx`
- `components/admin/audit/security-auth-logs-panel.tsx`
- `components/admin/audit/security-devices-panel.tsx`
- `components/admin/audit/activity-logs-panel.tsx`

## Ops

```bash
docker exec -e SEEDS_DIR=/opt/ryvo/seeds ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
docker restart ryvo-functions
```

Apply seeds **030**, **031**, **032** (idempotent). Re-login if `finances:checkouts:update` or `audit:update` missing on role.

## i18n

- `financeCheckouts` (search, stats, recovery dialog, delete confirm, status labels)
- `security`, `activity` sections (en/fr)
- `actions.remind`

## Permissions

| Permission | Use |
|------------|-----|
| `finances:checkouts:update` | Delete checkout, schedule recovery |
| `audit:update` | Revoke user device |

## Next

- Wire real auth flows into `security_auth_events` (login_failed, MFA, etc.)
- Device revoke enforced on mobile token validation
- Activity log actor email enrichment
- de/es/zh for new security/activity strings
