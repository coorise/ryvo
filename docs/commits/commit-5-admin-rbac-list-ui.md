# Commit 5 — Admin RBAC, list UI, and staff management

**Date:** 2026-05-19  
**Phase:** 4 (web portal) — continuation  
**Branch:** `dev`  
**Status:** COMPLETE — see also `commit-6-admin-delete-bulk-actions.md` for delete/bulk/tooltips

## Summary

Extended the Ryvo-Line admin portal with **dynamic RBAC** (roles/permissions in DB, not hardcoded role enums for authorization), full **Staff / Users / Drivers** management UIs, and a shared **admin list toolkit** (stats, search, table/grid views, column sort, pagination with auto-load vs manual pages).

## Web client (`client/web/ryvo/`)

### Admin sections (API-backed)

| Area | Routes | Notes |
|------|--------|--------|
| **Users** | `/admin/users`, `/new`, `/profile` | Client accounts; ban/unban, create, profile (no driver-only fields) |
| **Staff** | `/admin/staff`, `/new`, `/assign`, `/roles/new`, `/profile` | 3 tabs: Staffs, Roles, Permissions |
| **Drivers** | `/admin/drivers`, `/new`, `/profile` | KYC queue list, rating/trips, client reviews on driver profile only |

Staff tab state in URL: `?tab=staffs|roles|permissions` and `?role=<uuid>` for permissions editor.

### Shared list UI

| Piece | Path |
|-------|------|
| Stat cards, search, table shell | `src/components/admin/admin-list-ui.tsx` |
| Table / grid toggle | `src/components/admin/list-layout-toolbar.tsx` |
| Auto-load + page buttons | `src/components/admin/list-pagination-footer.tsx` |
| Search, sort, layout, page size | `src/hooks/use-list-controls.ts` |
| Slice visible rows | `src/hooks/use-paginated-slice.ts` |

**List toolbar controls (default):**

- Layout: **Table** | **Grid**
- Load: **Auto load** (infinite scroll, append) | **Pages** (numbered pagination)
- **Per page:** default `30` (range 5–100)

Pagination is **client-side** on filtered/sorted rows (full list still fetched from API; suitable for alpha scale).

### Staff UX

- `AdminListStack` — consistent `gap-6` between blocks (matches Users page spacing)
- **Create member** → `/admin/staff/new` (create user + assign staff role)
- **Permissions** tab — `PermissionMatrix` only (roles list separated from matrix)
- System roles: view-only or **edit** → opens Permissions tab with role pre-selected (`admin`, `moderator`, etc.; not `super_admin` / `client` / `driver`)

### Shell & branding

- **Sticky sidebar:** `h-svh overflow-hidden`; only main content scrolls
- **Favicon:** `src/app/icon.svg` (green bolt, Ryvo brand)
- Sidebar active item: **primary green** (`admin-shell.tsx`)

### Constants & i18n

- `src/configs/const.ts` — `ROUTES`, `PERMISSIONS`, `ADMIN_TABS`, `LIST_LAYOUT`, `LIST_LOAD_MODE`, `SORT_KEYS`, `PROFILE_VARIANT`, `QUERY_KEYS`, etc.
- Locales expanded: **en**, **fr**, **de** (list/staff keys); **es**, **zh** partially synced

### Services & hooks

- `rbac.service.ts` — users, roles, assign/revoke, matrix
- `drivers.service.ts` — list, detail, KYC review, create
- `use-rbac.ts` — permissions, assignable roles, matrix refetch

### Profile variants

`ProfileHeader` uses `PROFILE_VARIANT`: **client** | **staff** | **driver**

- Clients/staff: account info only (no rating, trips, client reviews)
- Drivers: rating, trips, KYC docs, **reviews from clients**

## Backend (`server/supabase/volumes/functions/`)

### Seeds

| File | Purpose |
|------|---------|
| `scripts/seeds/015_staff_hierarchy_abac.sql` | Staff hierarchy / ABAC baseline |
| `scripts/seeds/016_dynamic_rbac.sql` | Dynamic roles, permissions, system roles |

### Shared libs

- `dynamic-rbac.ts` — permission checks, assignable roles, matrix
- `rbac-admin.ts` — role CRUD, assign/revoke
- `admin-users.ts` — list/create/ban users by kind (`clients` \| `staff` \| `drivers`)
- `admin-drivers.ts` — driver list, detail, documents

### `auth-hooks` routes (high level)

- `GET/POST/PATCH/DELETE /v1/admin/roles`
- `GET /v1/admin/permissions`
- `POST /v1/admin/roles/assign`, `/revoke`
- `GET/POST/PATCH /v1/admin/users` (+ ban/unban)
- `GET/POST /v1/admin/drivers`, document review

After handler changes: `docker restart ryvo-functions`

## Apply seeds (existing DB)

```bash
docker exec -i supabase-db psql -U postgres -d postgres < server/supabase/scripts/seeds/015_staff_hierarchy_abac.sql
docker exec -i supabase-db psql -U postgres -d postgres < server/supabase/scripts/seeds/016_dynamic_rbac.sql
docker restart ryvo-functions
```

## Demo login

- Admin: `admin@ryvo-line.com` / `Admin@123` (`docs/project/credentials.txt`, gitignored)

**Important:** After permission/role changes, user must **sign out and sign in** to refresh JWT claims.

## Commands

```bash
cd client/web/ryvo
bun run dev      # http://localhost:3200
bun run build    # static export → out/
```

## What comes next

- Server-side pagination (`limit` / `offset`) on list APIs when datasets grow
- Wire remaining admin placeholders (rides, payments, audit tables) to same list UI
- Client/driver ride booking UI; live map
- Sync **es** / **zh** i18n fully with **en**
- Dockerfile / deploy for `out/`

## Known limitations

- List pagination slices client-side; APIs still return up to ~150 rows per kind
- Static export: profile/detail via query routes (e.g. `?id=`) where dynamic `[id]` is not used
- Turbopack dev cache warnings are harmless

## File index (new / major)

```
client/web/ryvo/src/components/admin/
  admin-list-ui.tsx, list-layout-toolbar.tsx, list-pagination-footer.tsx
  permission-matrix.tsx, profile-header.tsx, reviews-section.tsx
  staff-staffs-tab.tsx, staff-roles-tab.tsx, staff-permissions-tab.tsx
  entity-preview-dialog.tsx, star-rating.tsx, …
client/web/ryvo/src/app/admin/staff/**, users/new|profile, drivers/new|profile
client/web/ryvo/src/hooks/use-list-controls.ts, use-paginated-slice.ts, use-rbac.ts
client/web/ryvo/src/lib/admin-staff-url.ts, admin-paths.ts, format-date.ts
server/supabase/volumes/functions/_shared/lib/{dynamic-rbac,rbac-admin,admin-users,admin-drivers}.ts
server/supabase/scripts/seeds/015_*.sql, 016_*.sql
```
