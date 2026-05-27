-- Ryvo-Line core schema (see docs/project/instructions.md §3.1)
-- Applied after Supabase base init; safe to re-run sections with IF NOT EXISTS.

-- Roles & ABAC
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url text,
  rating_avg numeric(3,2) DEFAULT 0,
  trip_count int DEFAULT 0,
  preferred_payment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url text,
  rating_avg numeric(3,2) DEFAULT 0,
  trip_count int DEFAULT 0,
  kyc_status text NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  license_doc_key text,
  insurance_doc_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  s3_key text NOT NULL,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year int,
  plate text NOT NULL,
  color text,
  category text NOT NULL CHECK (category IN ('economy', 'comfort', 'xl')),
  capacity int DEFAULT 4,
  photo_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Location hot tables
CREATE TABLE IF NOT EXISTS public.driver_availability (
  driver_id uuid PRIMARY KEY REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  h3_index text,
  geom geography(POINT, 4326),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_location_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  geom geography(POINT, 4326) NOT NULL,
  accuracy_m numeric,
  speed_kmh numeric,
  heading numeric,
  sampled_at timestamptz NOT NULL DEFAULT now(),
  trip_id uuid
);

CREATE TABLE IF NOT EXISTS public.geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('safe_zone', 'busy_zone', 'no_go_zone', 'service_area', 'surge_zone')),
  geom geography(POLYGON, 4326) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.price_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_category text NOT NULL,
  base_fare numeric(10,2) NOT NULL,
  per_km numeric(10,2) NOT NULL,
  per_min numeric(10,2) NOT NULL,
  surge_multiplier numeric(4,2) DEFAULT 1.0,
  currency text NOT NULL DEFAULT 'USD',
  geofence_id uuid REFERENCES public.geofences(id),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz
);

-- Trip lifecycle
CREATE TABLE IF NOT EXISTS public.trip_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES auth.users(id),
  pickup_geom geography(POINT, 4326) NOT NULL,
  dropoff_geom geography(POINT, 4326) NOT NULL,
  pickup_address text,
  dropoff_address text,
  vehicle_category text NOT NULL,
  estimated_fare numeric(10,2),
  idempotency_key text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'cancelled', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  timeout_at timestamptz,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'timeout'))
);

CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.trip_requests(id),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id),
  rider_id uuid NOT NULL REFERENCES auth.users(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  pickup_geom geography(POINT, 4326) NOT NULL,
  dropoff_geom geography(POINT, 4326) NOT NULL,
  status text NOT NULL DEFAULT 'driver_en_route' CHECK (status IN (
    'driver_en_route', 'driver_arrived', 'rider_picked_up', 'in_progress',
    'completed', 'cancelled', 'disputed', 'no_show'
  )),
  started_at timestamptz,
  ended_at timestamptz,
  distance_km numeric(10,2),
  duration_min int,
  polyline_encoded text,
  route_geom geography(LINESTRING, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fare_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  base_fare numeric(10,2) NOT NULL DEFAULT 0,
  distance_fare numeric(10,2) NOT NULL DEFAULT 0,
  time_fare numeric(10,2) NOT NULL DEFAULT 0,
  surge_amount numeric(10,2) NOT NULL DEFAULT 0,
  promo_discount numeric(10,2) NOT NULL DEFAULT 0,
  tip numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id),
  rider_id uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL,
  provider_intent_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  gross_fare numeric(10,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  net_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES public.payment_intents(id),
  amount numeric(10,2) NOT NULL,
  reason text,
  initiated_by uuid REFERENCES auth.users(id),
  status text NOT NULL,
  provider_refund_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL,
  max_uses int,
  used_count int DEFAULT 0,
  expires_at timestamptz,
  min_fare numeric(10,2),
  geofence_id uuid REFERENCES public.geofences(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  trip_id uuid REFERENCES public.trips(id),
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ratings_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id),
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  reviewee_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('driver', 'rider')),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  trip_id uuid REFERENCES public.trips(id),
  category text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  diff jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  channel text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id),
  clocked_in_at timestamptz NOT NULL,
  clocked_out_at timestamptz,
  total_km numeric(10,2),
  trip_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.idempotency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  endpoint text NOT NULL,
  request_hash text,
  response_status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('export', 'delete')),
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User moderation fields on auth.users via public profile mirror
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_at timestamptz,
  appeal_at timestamptz,
  gdpr_consent_at timestamptz,
  tos_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
