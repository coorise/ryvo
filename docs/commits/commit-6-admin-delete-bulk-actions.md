# Commit 6 — Admin delete flow, bulk selection, and soft delete

**Date:** 2026-05-19  
**Phase:** 4 (web portal) — continuation  
**Branch:** `dev`  
**Status:** COMPLETE

## Summary

Extended admin list UX with **delete actions** (table + grid), **tooltips** on row actions, **bulk selection** with multi-delete, and a guided delete flow: temporary vs permanent removal, danger-zone confirmation, and a **10-second cancellable grace period** before execution.

Backend adds **soft delete** columns and `DELETE /v1/admin/users/:user_id` with `{ mode: "soft" | "permanent" }`.

## Web client

### Row actions (`admin-list-ui.tsx`)

| Action | Icon | Tooltip key |
|--------|------|-------------|
| View | Eye | `actions.view` |
| Edit | Pencil | `actions.edit` |
| Profile | User | `actions.profile` |
| Delete | Trash | `actions.delete` |

Radix **TooltipProvider** wraps the app in `app-providers.tsx`.

### Delete UX

| Step | Component / behavior |
|------|----------------------|
| 1 | `DeleteEntityDialog` — choose **Temporary** (soft) or **Permanent** |
| 2 | Permanent → danger zone; type `DELETE` to enable confirm |
| 3 | `useAdminDeleteFlow` — Sonner toast ~10s with **Cancel**; then API call |

Constants: `DELETE_MODE`, `DELETE_GRACE_MS` (10_000), `DELETE_CONFIRM_TEXT` in `const.ts`.

### Bulk selection

- `useBulkSelection` — toggle rows, select-all on current page
- `ListSelectCheckbox` — table column + grid card corner
- `BulkSelectionBar` — count, clear, delete selected
- Applied on **Users**, **Staff**, **Drivers**, **Roles** (custom roles only for delete checkbox)

### Roles tab

- Soft delete **not** offered (`allowSoftDelete: false`)
- Delete only for **non-system** roles via `deleteRole`
- System roles: view + manage permissions (edit → Permissions tab)

## Backend

### Seed `017_user_soft_delete.sql`

```sql
user_profiles.deleted_at timestamptz
user_profiles.deleted_by uuid → auth.users
```

Tracked in `ryvo.schema_migrations` as `017_user_soft_delete.sql`.

### `admin-users.ts`

- `deleteAdminUser(actor, userId, mode)` — soft sets `deleted_at`; permanent calls `auth.admin.deleteUser`
- Permission: `users:delete`, or `staff:delete` / `drivers:delete` by target role
- `listAdminUsers` / `enrichUsers` skip rows with `deleted_at` set

### `auth-hooks` handler

```
DELETE /v1/admin/users/:user_id
Body: { "mode": "soft" | "permanent" }
```

### `rbac.service.ts`

- `deleteUser(token, userId, mode)` — DELETE with JSON body

## Migrations (operational)

Idempotent runner: `server/supabase/scripts/migrate-idempotent.sh` (on `ryvo-functions` container start).

```bash
# Verify all seeds applied
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT version FROM ryvo.schema_migrations ORDER BY version;"

# Apply pending / changed seeds
docker exec ryvo-functions bash /opt/ryvo/migrate-idempotent.sh
docker restart ryvo-functions
```

All seeds `001`–`017` verified with matching checksums (2026-05-19).

## i18n

New keys: `actions.delete`, `actions.profile`, `delete.*`, `list.selectedCount`, `list.selectAll`, etc. in **en** and **fr**.

## Files (new)

```
client/web/ryvo/src/components/admin/delete-entity-dialog.tsx
client/web/ryvo/src/components/admin/bulk-selection-bar.tsx
client/web/ryvo/src/components/ui/tooltip.tsx
client/web/ryvo/src/hooks/use-admin-delete-flow.ts
client/web/ryvo/src/hooks/use-bulk-selection.ts
server/supabase/scripts/seeds/017_user_soft_delete.sql
```

## What comes next

- Restore / undelete UI for soft-deleted users
- Server-side pagination on list APIs
- Sync **de** / **es** / **zh** delete i18n keys

## Known notes

- Suspend/ban moved off the profile icon on Users (profile uses person icon); restore suspend action if product requires it
- Role delete is permanent only (no soft archive for roles)
