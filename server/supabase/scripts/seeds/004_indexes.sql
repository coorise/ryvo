CREATE INDEX IF NOT EXISTS driver_availability_geom_idx ON public.driver_availability USING GIST (geom);
CREATE INDEX IF NOT EXISTS driver_location_samples_geom_idx ON public.driver_location_samples USING GIST (geom);
CREATE INDEX IF NOT EXISTS geofences_geom_idx ON public.geofences USING GIST (geom);
CREATE INDEX IF NOT EXISTS driver_availability_h3_idx ON public.driver_availability (h3_index);
CREATE UNIQUE INDEX IF NOT EXISTS idempotency_key_idx ON public.idempotency_requests (key);
CREATE INDEX IF NOT EXISTS trips_status_idx ON public.trips (status);
CREATE INDEX IF NOT EXISTS trip_requests_status_idx ON public.trip_requests (status);
CREATE INDEX IF NOT EXISTS driver_location_samples_sampled_at_idx
  ON public.driver_location_samples (sampled_at DESC);
