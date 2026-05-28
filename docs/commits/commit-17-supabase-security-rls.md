# Commit 17 — Supabase Security Advisor + RLS policies

## Problem

Supabase Security Advisor reported WARN/INFO lints: mutable `search_path` on functions, `anon`/`authenticated` EXECUTE on admin RPCs, GraphQL exposure, PostGIS catalog privileges, and **RLS enabled with no policy** on ~43 `public` tables.

## Fix

| Area | Files |
|------|--------|
| `search_path` + revokes in seeds | `001`, `003`, `005`, `009`, `010`, `012`, `013`, `039`, `041` |
| Linter batch migrations | `043_supabase_linter_security.sql`, `044_drop_graphql_and_rpc.sql`, `045_postgis_catalog_privileges.sql` |
| RLS policies (lint 0008) | `046_rls_missing_policies.sql` — JWT staff helpers, service-only deny, user/trip/staff rules |
| PostGIS revoke as `supabase_admin` | `migrate-idempotent.sh` runs `045` as `supabase_admin` |

## Access model

- **Edge functions:** `service_role` (bypasses RLS).
- **PostgREST / clients:** gated by RLS; staff roles read from JWT `app_metadata.roles` (`auth_jwt_is_staff()`).
- **Internal tables** (`audit_logs`, `email_outbox`, `idempotency_requests`, `security_auth_events`): `USING (false)` for authenticated.

## Apply on VPS

Migrations run via `deploy.sh dev` → Supabase migrate container / `migrate-idempotent.sh`.

```bash
# After deploy, optional local verify
docker exec -i supabase-db psql -U postgres -d postgres -tAc "
SELECT count(*) FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid);"
# Expect 0 or only spatial_ref_sys (PostGIS)
```

## Notes

- `postgis` in `public` on **existing** DBs cannot be moved; lint 0014 may remain until DB rebuild.
- `pg_graphql` dropped in `044` (app uses REST only).
