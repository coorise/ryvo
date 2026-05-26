-- Live map: enable realtime for online drivers + seed a demo online driver location.

-- Ensure driver_availability emits realtime updates.
ALTER TABLE public.driver_availability REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add table to supabase_realtime publication (ignore if already there)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_availability;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Seed demo location for driver@ryvo-line.com if present.
DO $$
DECLARE
  v_driver uuid;
BEGIN
  SELECT id INTO v_driver FROM auth.users WHERE email = 'driver@ryvo-line.com' LIMIT 1;
  IF v_driver IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.driver_availability (driver_id, is_online, geom, updated_at)
  VALUES (
    v_driver,
    true,
    ST_SetSRID(ST_MakePoint(-73.5878, 45.5088), 4326)::geography,
    now()
  )
  ON CONFLICT (driver_id) DO UPDATE
    SET is_online = EXCLUDED.is_online,
        geom = EXCLUDED.geom,
        updated_at = EXCLUDED.updated_at;
END $$;

