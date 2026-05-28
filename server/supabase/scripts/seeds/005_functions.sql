-- PostGIS helpers for Ryvo-Line

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
