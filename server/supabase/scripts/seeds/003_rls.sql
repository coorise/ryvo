-- Enable RLS on all Ryvo public tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_location_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: current user has role
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
$$;

-- Riders: own data
DROP POLICY IF EXISTS rider_profiles_self ON public.rider_profiles;
CREATE POLICY rider_profiles_self ON public.rider_profiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS trip_requests_rider ON public.trip_requests;
CREATE POLICY trip_requests_rider ON public.trip_requests
  FOR ALL USING (rider_id = auth.uid());

DROP POLICY IF EXISTS trips_rider ON public.trips;
CREATE POLICY trips_rider ON public.trips
  FOR SELECT USING (rider_id = auth.uid());

-- Drivers: own data
DROP POLICY IF EXISTS driver_profiles_self ON public.driver_profiles;
CREATE POLICY driver_profiles_self ON public.driver_profiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS driver_availability_self ON public.driver_availability;
CREATE POLICY driver_availability_self ON public.driver_availability
  FOR ALL USING (driver_id = auth.uid());

DROP POLICY IF EXISTS trips_driver ON public.trips;
CREATE POLICY trips_driver ON public.trips
  FOR ALL USING (driver_id = auth.uid());

-- Admins: broad read (refine per permission in Phase 3)
DROP POLICY IF EXISTS admin_read_trips ON public.trips;
CREATE POLICY admin_read_trips ON public.trips
  FOR SELECT USING (public.has_role('admin') OR public.has_role('super_admin') OR public.has_role('staff'));

DROP POLICY IF EXISTS admin_manage_roles ON public.user_roles;
CREATE POLICY admin_manage_roles ON public.user_roles
  FOR ALL USING (public.has_role('admin') OR public.has_role('super_admin'));

-- Service role bypasses via supabase service_key (bypasses RLS by default)
