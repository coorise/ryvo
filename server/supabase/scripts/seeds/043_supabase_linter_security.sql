-- Supabase Security Advisor: function search_path, PostGIS schema, anon GraphQL/EXECUTE hardening.
-- Re-run safe on existing DBs (idempotent).

-- ---------------------------------------------------------------------------
-- PostGIS: move out of public (lint 0014_extension_in_public)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'postgis schema move skipped (existing DB): %', SQLERRM;
END $$;
-- Note: postgis in `public` on existing DBs cannot be moved (extension lacks SET SCHEMA).
-- Fresh installs use 001_extensions.sql (WITH SCHEMA extensions). Lint 0014 may remain locally.

-- ---------------------------------------------------------------------------
-- Functions: fixed search_path (lint 0011_function_search_path_mutable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nearby_drivers(
  lat double precision,
  lng double precision,
  radius_m double precision DEFAULT 5000
)
RETURNS SETOF public.driver_availability
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT da.*
  FROM public.driver_availability da
  WHERE da.is_online = true
    AND da.geom IS NOT NULL
    AND ST_DWithin(
      da.geom,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  ORDER BY ST_Distance(
    da.geom,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );
$$;

CREATE OR REPLACE FUNCTION public.point_in_geofence(
  lat double precision,
  lng double precision,
  fence_type text DEFAULT NULL
)
RETURNS SETOF public.geofences
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT g.*
  FROM public.geofences g
  WHERE ST_Contains(
    g.geom::geometry,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  )
  AND (fence_type IS NULL OR g.type = fence_type);
$$;

CREATE OR REPLACE FUNCTION public.match_drivers_for_request(p_request_id uuid)
RETURNS TABLE(driver_id uuid, dist_m double precision)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH req AS (
    SELECT pickup_geom
    FROM public.trip_requests
    WHERE id = p_request_id
  )
  SELECT da.driver_id,
         ST_Distance(da.geom, r.pickup_geom) AS dist_m
  FROM public.driver_availability da
  CROSS JOIN req r
  WHERE da.is_online = true
    AND da.geom IS NOT NULL
    AND r.pickup_geom IS NOT NULL
    AND ST_DWithin(da.geom, r.pickup_geom, 8000)
  ORDER BY dist_m
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.expire_trip_offers()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int := 0;
BEGIN
  UPDATE public.trip_assignments ta
  SET status = 'timeout'
  WHERE ta.status = 'offered'
    AND ta.timeout_at < now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPCs: service_role only (lint 0028 / 0029)
-- Default Supabase grants EXECUTE to anon/authenticated unless revoked.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn regprocedure;
  fns regprocedure[] := ARRAY[
    'public.admin_online_drivers(text)',
    'public.admin_set_email_verified(uuid,boolean)',
    'public.admin_user_emails(uuid[])',
    'public.get_user_id_by_email(text)',
    'public.expire_trip_offers()',
    'public.nearby_drivers(double precision,double precision,double precision)',
    'public.point_in_geofence(double precision,double precision,text)',
    'public.match_drivers_for_request(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_welcome_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- PostGIS catalog + st_estimatedextent: see 045_postgis_catalog_privileges.sql (supabase_admin).
-- has_role + pg_graphql: see 044_drop_graphql_and_rpc.sql.

-- ---------------------------------------------------------------------------
-- GraphQL schema discovery: revoke anon table/view access (lint 0026)
-- REST for signed-in users uses role `authenticated` + RLS (unchanged).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fqname,
           c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'v', 'm', 'f')
      AND NOT (c.relname LIKE 'pg_%')
  LOOP
    BEGIN
      IF obj.relkind IN ('r', 'm') THEN
        EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', obj.fqname);
      ELSIF obj.relkind = 'v' THEN
        EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', obj.fqname);
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END $$;
