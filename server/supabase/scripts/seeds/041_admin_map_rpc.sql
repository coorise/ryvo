-- Admin RPCs for live map (batch email/name + computed lat/lng)

CREATE OR REPLACE FUNCTION public.admin_online_drivers(p_q text DEFAULT NULL)
RETURNS TABLE (
  driver_id uuid,
  is_online boolean,
  status text,
  lat double precision,
  lng double precision,
  h3_index text,
  updated_at timestamptz,
  name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH active AS (
    SELECT DISTINCT t.driver_id
    FROM public.trips t
    WHERE t.status IN ('driver_en_route','driver_arrived','rider_picked_up','in_progress')
  )
  SELECT
    da.driver_id,
    da.is_online,
    CASE WHEN a.driver_id IS NULL THEN 'idle' ELSE 'on_trip' END AS status,
    ST_Y((da.geom::geometry))::double precision AS lat,
    ST_X((da.geom::geometry))::double precision AS lng,
    da.h3_index,
    da.updated_at,
    COALESCE(
      (u.raw_user_meta_data->>'full_name')::text,
      split_part(u.email::text, '@', 1),
      'Driver'
    ) AS name
  FROM public.driver_availability da
  LEFT JOIN active a ON a.driver_id = da.driver_id
  LEFT JOIN auth.users u ON u.id = da.driver_id
  WHERE da.is_online = true
    AND (
      p_q IS NULL
      OR p_q = ''
      OR lower(da.driver_id::text) LIKE '%' || lower(p_q) || '%'
      OR lower(COALESCE((u.raw_user_meta_data->>'full_name')::text, u.email::text, '')) LIKE '%' || lower(p_q) || '%'
    )
  ORDER BY da.updated_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.admin_online_drivers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_online_drivers(text) TO service_role;

