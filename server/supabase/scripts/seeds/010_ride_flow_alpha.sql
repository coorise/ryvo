-- Phase 3c: Uber-like ride flow (accept before pay, chat, profiles, KYC docs)

-- Trip request lifecycle states
ALTER TABLE public.trip_requests DROP CONSTRAINT IF EXISTS trip_requests_status_check;
ALTER TABLE public.trip_requests ADD CONSTRAINT trip_requests_status_check CHECK (
  status IN ('pending', 'offering', 'accepted', 'awaiting_payment', 'paid', 'cancelled', 'expired')
);

ALTER TABLE public.trip_requests
  ADD COLUMN IF NOT EXISTS active_assignment_id uuid REFERENCES public.trip_assignments(id),
  ADD COLUMN IF NOT EXISTS fare_breakdown jsonb;

-- Payment linked to request until trip exists
ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.trip_requests(id);

-- Trip chat (driver <-> rider after payment)
CREATE TABLE IF NOT EXISTS public.trip_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_messages_trip_id_idx ON public.trip_messages(trip_id, created_at);

-- KYC document checklist per driver
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'national_id', 'passport', 'selfie_with_id', 'driver_license', 'bank_statement'
  )),
  s3_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, doc_type)
);

-- Default fare config seed (global tariffs, no geofence)
INSERT INTO public.price_configs (vehicle_category, base_fare, per_km, per_min, surge_multiplier, currency)
SELECT v.cat, v.base, v.km, v.min, v.surge, v.cur
FROM (VALUES
  ('economy'::text, 3.50::numeric, 1.20::numeric, 0.35::numeric, 1.0::numeric, 'USD'::text),
  ('comfort', 5.00, 1.65, 0.45, 1.0, 'USD'),
  ('xl', 7.00, 2.10, 0.55, 1.0, 'USD')
) AS v(cat, base, km, min, surge, cur)
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_configs p
  WHERE p.vehicle_category = v.cat AND p.geofence_id IS NULL
);

-- RLS
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_messages_participants ON public.trip_messages;
CREATE POLICY trip_messages_participants ON public.trip_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_messages.trip_id
        AND (t.rider_id = auth.uid() OR t.driver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS kyc_documents_driver ON public.kyc_documents;
CREATE POLICY kyc_documents_driver ON public.kyc_documents
  FOR ALL USING (driver_id = auth.uid());

DROP POLICY IF EXISTS kyc_documents_staff ON public.kyc_documents;
CREATE POLICY kyc_documents_staff ON public.kyc_documents
  FOR SELECT USING (public.has_role('admin') OR public.has_role('super_admin') OR public.has_role('staff'));

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Admin pricing permission
INSERT INTO public.permissions (name, description) VALUES
  ('pricing:manage', 'Manage fare tariffs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name = 'pricing:manage'
WHERE r.name IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- Expire stale offers (used by cron)
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
