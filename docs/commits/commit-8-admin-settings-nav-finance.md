# Commit 8 — Settings hub, collapsible admin nav, observability, analytics & finance modules

**Date:** 2026-05-19  
**Phase:** 4 (web portal)  
**Branch:** `dev`  
**Status:** COMPLETE  
**Predecessor:** `commit-6-admin-delete-bulk-actions.md`, `commit-7-settings-hub.md` (settings slice, included here)

## Summary

Major admin portal expansion after delete/bulk work:

1. **Settings** — tabbed hub (Profile, General, Payment, Mail, Notifications) with RBAC-gated tabs  
2. **Sidebar** — collapsible groups (Overview, Main, HR, Finances, Audits, Advanced); URL path guard  
3. **Observability** — resource usage dashboard (Advanced)  
4. **Speculative estimator** — OPEX vs revenue charts + PDF export (Finances)  
5. **Analytics** — Power BI–style KPI workspace + PDF export (Audits)  
6. **Finance ops** — Referrals, Tariffs, Checkouts, Paychecks (between Payments and Speculative)

## 1. Settings hub (`/admin/settings`)

| Tab | Permission | Notes |
|-----|------------|--------|
| Profile | Always (admin) | `/v1/me/profile` — photo, name, username, address |
| General | `settings:read` / `settings:update` | Platform prefs extended (maintenance, map, support) |
| Payment | `settings:payment:*` | Stripe mode, fees, fares |
| Mail | `settings:mail:*` or `email:templates` | Template editor |
| Notifications | `settings:notifications:*` | Event × channel × audience rules |

**Seed:** `018_settings_hub.sql`  
**Libs:** `user-self-profile.ts`, `payment-settings.ts`, `notification-settings.ts`

## 2. Collapsible sidebar & route protection

**Config:** `configs/admin-nav.ts`  
**UI:** `admin-sidebar-nav.tsx` — expand/collapse + `localStorage`; Main expanded by default  
**Guards:** `admin-access.ts`, `admin-path-guard.tsx` in `app/admin/layout.tsx` — blocks address-bar access to forbidden routes

```
Overview
Main ▼ (default open)     → Live map, Rides, Users, Drivers KYC
Human resources ▼         → Staff, Support tickets
Finances ▼                → Referrals, Tariffs, Checkouts, Payments, Paychecks, Speculative
Audits ▼                  → Security logs, Activity logs, Analytics
Advanced ▼                → Observability, Settings
```

## 3. Observability (`/admin/observability`)

- DB, storage, API traffic, MAU cards; runtime CPU/RAM snapshot  
- Permission: `observability:read` (seed `019`)  
- Fallback: `settings:read`

## 4. Speculative live estimator (`/admin/finance/speculative`)

- Tabs: **Revenues** (line/area/bar, pie breakdown, ROI table, PDF export) + **OPEX configs** (resource list, hourly price, margins)  
- Recharts + `jspdf` / `html2canvas`  
- OPEX in `localStorage`; ties into revenue trend  
- Permissions: `finances:speculative:*` (seed `020`)

## 5. Analytics (`/admin/analytics`)

- Period + audience filters; KPI tiles; volume/ratings/experience/destinations charts  
- PDF export; demo datasets (`lib/analytics-demo.ts`)  
- Permission: `analytics:read` (seed `020`)

## 6. Finance modules (seed `021`)

| Route | Feature |
|-------|---------|
| `/admin/finance/referrals` | Tabs Bonus / Referrals / Settings; client & driver tables; loyalty |
| `/admin/finance/tariffs` | Essential, Pro, per-drive/quota/daily/weekly/monthly packages |
| `/admin/finance/checkouts` | Mobile checkout funnel (open/abandoned/cancelled/completed) |
| `/admin/finance/paychecks` | Driver pay queue: pay, hold, manual add |
| `/admin/payments` | (existing) |
| `/admin/finance/speculative` | (see §4) |

**API:** `/v1/admin/finance/*` in `finance-admin.ts`  
**Permissions:** `finances:referrals:*`, `finances:tariffs:*`, `finances:checkouts:read`, `finances:paychecks:*`

**Tables:** `referral_settings`, `referral_entries`, `loyalty_points`, `driver_tariff_packages`, `driver_paychecks`, `checkout_sessions`

## Seeds applied (idempotent)

| Seed | Purpose |
|------|---------|
| `018_settings_hub.sql` | Profile columns, payment/notification settings, mail perms |
| `019_observability_permission.sql` | `observability:read` |
| `020_finance_analytics_permissions.sql` | Speculative + analytics perms |
| `021_finance_modules.sql` | Finance tables + perms + default tariffs |

```bash
docker exec -e SEEDS_DIR=/opt/ryvo/seeds ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
docker restart ryvo-functions
```

Entrypoint sets `SEEDS_DIR=/opt/ryvo/seeds` on container start.

## Key web files (new/changed)

```
client/web/ryvo/src/configs/admin-nav.ts
client/web/ryvo/src/components/layout/admin-sidebar-nav.tsx
client/web/ryvo/src/guards/admin-access.ts
client/web/ryvo/src/guards/admin-path-guard.tsx
client/web/ryvo/src/app/admin/settings/page.tsx
client/web/ryvo/src/components/admin/settings/*
client/web/ryvo/src/app/admin/observability/page.tsx
client/web/ryvo/src/app/admin/analytics/page.tsx
client/web/ryvo/src/app/admin/finance/*
client/web/ryvo/src/components/admin/finance/*
client/web/ryvo/src/services/settings.service.ts
client/web/ryvo/src/services/finance.service.ts
client/web/ryvo/src/lib/finance-speculative.ts
client/web/ryvo/src/lib/export-pdf.ts
client/web/ryvo/src/lib/analytics-demo.ts
```

## Dependencies added

- `recharts`, `jspdf`, `html2canvas`

## After permission changes

Staff must **sign out/in** to refresh JWT claims.

## Next steps

- Wire analytics/speculative to live trip/payment aggregates  
- Persist OPEX/referral settings server-side for multi-admin teams  
- Avatar upload via Storage; notification consumer reads routing rules  
- i18n de/es/zh for `settingsHub`, `speculative`, `analytics`, finance keys
