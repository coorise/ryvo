-- PostGIS catalog objects are owned by supabase_admin with default grants to anon/authenticated.
-- Run as postgres via migrate-idempotent.sh (SET ROLE avoids a separate supabase_admin password).

SET LOCAL ROLE supabase_admin;

REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geometry_columns FROM anon, authenticated, PUBLIC;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'st_estimatedextent'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO postgres, service_role, supabase_admin',
      r.fn
    );
  END LOOP;
END $$;

RESET ROLE;
