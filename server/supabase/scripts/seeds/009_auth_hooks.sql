-- Auth hooks: JWT custom claims (ABAC) + new user bootstrap

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  claims jsonb;
  role_names text[];
  perm_names text[];
  primary_role text;
BEGIN
  uid := (event->>'user_id')::uuid;
  claims := coalesce(event->'claims', '{}'::jsonb);

  SELECT coalesce(array_agg(r.name ORDER BY r.name), ARRAY[]::text[])
  INTO role_names
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = uid;

  SELECT coalesce(array_agg(DISTINCT p.name ORDER BY p.name), ARRAY[]::text[])
  INTO perm_names
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role_id = ur.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = uid;

  primary_role := CASE
    WHEN 'super_admin' = ANY(role_names) THEN 'super_admin'
    WHEN 'admin' = ANY(role_names) THEN 'admin'
    WHEN 'staff' = ANY(role_names) THEN 'staff'
    WHEN 'moderator' = ANY(role_names) THEN 'moderator'
    WHEN 'driver' = ANY(role_names) THEN 'driver'
    ELSE 'client'
  END;

  claims := jsonb_set(claims, '{app_role}', to_jsonb(primary_role), true);
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb)
      || jsonb_build_object('roles', role_names, 'permissions', perm_names),
    true
  );

  RETURN jsonb_build_object('claims', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name text;
  role_uuid uuid;
BEGIN
  INSERT INTO public.user_profiles (user_id, tos_accepted_at, gdpr_consent_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  role_name := CASE
    WHEN NEW.email ILIKE '%driver%' THEN 'driver'
    WHEN NEW.email ILIKE '%admin%' THEN 'super_admin'
    ELSE 'client'
  END;

  SELECT id INTO role_uuid FROM public.roles WHERE name = role_name LIMIT 1;
  IF role_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, role_uuid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF role_name = 'client' THEN
    INSERT INTO public.rider_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF role_name = 'driver' THEN
    INSERT INTO public.driver_profiles (user_id, kyc_status)
    VALUES (NEW.id, 'pending') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.match_drivers_for_request(p_request_id uuid)
RETURNS TABLE(driver_id uuid, dist_m double precision)
LANGUAGE sql
STABLE
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
  LIMIT 5;
$$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('ryvo-storage', 'ryvo-storage', false)
ON CONFLICT (id) DO NOTHING;
