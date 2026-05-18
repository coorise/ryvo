# Commit 4 — Ryvo-Line web client (Phase 4 alpha)

**Date:** 2026-05-18  
**Phase:** 4 (web portal)  
**Status:** IN PROGRESS — admin + auth wired to backend; client/driver portals are shells

## Summary

Next.js **static export** app at `client/web/ryvo/` matching `docs/project/draft-instructions.txt` (flat `src/`, no Turborepo `apps/` nesting). Branding: **Ryvo-Line**. Dev server: `0.0.0.0:3200`.

## Layout (canonical)

```
client/web/ryvo/
├── src/
│   ├── app/           # App Router routes
│   ├── components/    # ui (ShadCN), layout, ryvo, auth, providers
│   ├── configs/       # const, env, http, routes
│   ├── core/          # session-user mapping
│   ├── guards/        # ABAC, RouteGuard, PermissionGate
│   ├── hooks/
│   ├── i18n/          # en, fr, es, zh, de (i18next)
│   ├── lib/           # api-client, base-service, storage
│   ├── services/      # Supabase auth, admin, password reset
│   ├── stores/        # Zustand auth persist
│   ├── styles/        # globals.css (green primary theme)
│   └── types/         # Zod schemas
├── package.json
├── next.config.mjs    # output: "export", trailingSlash
└── components.json    # shadcn radix-nova
```

**Removed:** `apps/web/`, `packages/ui/`, `packages/eslint-config/`, `turbo.json` (incorrect monorepo scaffold).

## Routes

| Path | Role | Status |
|------|------|--------|
| `/landing` | Public | Marketing page |
| `/auth/login`, `/register`, `/verify-email` | Public | Supabase Auth |
| `/auth/forgot-password`, `/otp`, `/reset-password` | Public | OTP reset via `auth-hooks` |
| `/admin` | admin, super_admin, staff, moderator | Dashboard — **live API data** |
| `/admin/map`, `/rides`, `/users`, `/drivers`, `/tickets`, … | Staff | Placeholders + nav |
| `/admin/settings` | admin, super_admin | PATCH `platform_settings` |
| `/client`, `/driver` | client, driver | Shell dashboards |
| `/legal/tos`, `/legal/privacy` | Public | Static |

## Features implemented

### Auth & session
- Supabase browser client (`@supabase/ssr`)
- Zustand persist `ryvo.auth.v1`
- JWT role merge from access token (`app_metadata`) → correct `/admin` redirect for `super_admin`
- `RouteGuard` + ABAC (`hasRole`, `hasPermission`)

### Forgot password (client + server)
- SQL: `013_password_reset.sql` — `password_reset_challenges`, email template
- APIs: `POST /v1/auth/forgot-password`, `verify-reset-otp`, `reset-password`
- Async email via `email_outbox` (non-blocking SMTP)
- Web flow: forgot → OTP → reset password

### Admin dashboard (real data)
- SQL: `014_platform_settings.sql` — singleton `preferences` JSON
- APIs:
  - `GET /v1/settings/public` — appName, languages (no auth)
  - `GET/PATCH /v1/admin/settings`
  - `GET /v1/admin/dashboard` — aggregates from `trip_requests`, `payment_intents`, `trips`, `kyc_documents`, `support_tickets`, `audit_logs`
- React Query: `useAdminDashboard`, sidebar badges from API
- No hardcoded mock stats (empty DB → zeros / “No data yet”)

### i18n
- `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- Locales: en, fr, es, zh, de
- Header language switcher; default from public settings
- Storage key: `ryvo.lang`

### UI
- ShadCN Nova, green primary (`src/styles/globals.css`)
- `AdminShell`, `DashboardShell`, `BrandLogo`, `RyvoButton` intents
- Mobile-first layouts

## Environment (web)

`client/web/ryvo/.env.local` (from `server/supabase/.env`):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:8400` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_FUNCTIONS_URL` | `http://localhost:8400/functions/v1` |

## Commands

```bash
cd client/web/ryvo
bun install
bun run dev      # http://0.0.0.0:3200
bun run build    # static site → out/
bun run typecheck
```

## Backend dependencies (same commit)

| File | Purpose |
|------|---------|
| `server/supabase/scripts/seeds/013_password_reset.sql` | Reset OTP tables |
| `server/supabase/scripts/seeds/014_platform_settings.sql` | Admin preferences |
| `_shared/lib/admin-dashboard.ts` | Dashboard aggregates |
| `_shared/lib/platform-settings.ts` | Read/update preferences |
| `_shared/lib/password-reset.ts` | Reset flow + outbox |
| `auth-hooks/src/handler.ts` | New routes listed above |

Apply seeds on existing DB:

```bash
docker exec -i supabase-db psql -U postgres -d postgres < server/supabase/scripts/seeds/013_password_reset.sql
docker exec -i supabase-db psql -U postgres -d postgres < server/supabase/scripts/seeds/014_platform_settings.sql
docker restart ryvo-functions
```

## Demo login

- Admin: `admin@ryvo-line.com` / `Admin@123` (see `docs/project/credentials.txt`, gitignored)

## What comes next

- Wire admin sub-pages (rides, users, KYC queue) to existing backend services
- Client/driver ride booking UI (trip-lifecycle, routing-engine)
- Live map (realtime trip locations)
- Email verification gate on web after signup
- Dockerfile / static deploy for `out/`

## Known issues

- Admin list pages are placeholders; only dashboard + settings are API-backed
- Static export: no Next.js server actions; all data via functions gateway + Supabase client
- Turbopack dev cache may log “Persisting failed” warnings (harmless)
