# Commit 18 — Admin editable profiles + driver/client portal nav

## Problem

- Admin driver/client/staff profile pages were read-only; staff need full edit control when end users cannot update their own data.
- No extensible metadata on user profiles for future fields.
- Driver/client apps (`ryvo-line.dev`) had minimal 3-link sidebars instead of the draft portal structure (Overview, Main, Communication, HR, Finances, Audits, Advanced).

## Fix

| Area | Files |
|------|--------|
| DB | `047_user_custom_fields.sql` — `user_profiles.custom_fields` jsonb |
| API | `admin-users.ts` — `updateAdminUser` (phone, username, custom_fields; role-based `drivers:update` / `users:update` / `staff:update`) |
| Admin UI | `profile-manage-section.tsx`; wired on users/drivers/staff profile pages |
| Client portal | `portal-nav.ts`, `portal-sidebar-nav.tsx`, `dashboard-shell` portal mode, scaffold routes under `app/driver/**` and `app/client/**` |
| i18n | `en.json` portal nav keys (ryvo + admin profile strings) |

## Portal routes (scaffold)

**Driver:** `/driver`, `/driver/main/live-map` (Live / Incoming / Driving tabs), rides, clients, kyc, communication/*, hr/feedbacks, finances/payments, audits/*, advanced/settings (Profile / General / Payment / Notifications).

**Client:** `/client`, `/client/main/live-map` (Go To / Requesting / Driving), rides, drivers, communication/*, hr/feedbacks, finances/payments, audits/*, advanced/settings.

## Deploy

Push `dev` → CI builds `ryvo-web` + `ryvo-web-admin`, VPS blue/green deploy. Run migrations for `047` on Supabase stack.

Test: https://ryvo-line.dev.agglomy.com — login as driver/client; sidebar matches draft groups. Admin: edit profile fields on KYC/user/staff detail pages.
