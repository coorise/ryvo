-- PostGIS catalog objects are owned by supabase_admin with default grants to anon/authenticated.
-- Best-effort as postgres (see migrate-idempotent.sh); skips cleanly when not owner.

DO $$
BEGIN
  REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '045 spatial_ref_sys revoke skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated, PUBLIC;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '045 geography_columns revoke skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  REVOKE ALL ON TABLE public.geometry_columns FROM anon, authenticated, PUBLIC;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '045 geometry_columns revoke skipped: %', SQLERRM;
END $$;

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
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO postgres, service_role, supabase_admin',
        r.fn
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '045 st_estimatedextent skipped: %', SQLERRM;
    END;
  END LOOP;
END $$;
