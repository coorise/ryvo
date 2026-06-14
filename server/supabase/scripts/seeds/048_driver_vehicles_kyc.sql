-- Driver vehicles (Know Your Car) + active vehicle on driver profile

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS active_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS max_speed_kmh int,
  ADD COLUMN IF NOT EXISTS age_years int,
  ADD COLUMN IF NOT EXISTS tyres_type text,
  ADD COLUMN IF NOT EXISTS carbon_print numeric(10, 2),
  ADD COLUMN IF NOT EXISTS energy_type text CHECK (
    energy_type IS NULL OR energy_type IN ('electric', 'fuel', 'hybrid')
  ),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS banner_key text,
  ADD COLUMN IF NOT EXISTS image_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_key text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('registration', 'insurance', 'other')),
  label text,
  s3_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_documents_vehicle_idx ON public.vehicle_documents (vehicle_id);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_documents_vehicle_reg_insurance_uidx
  ON public.vehicle_documents (vehicle_id, doc_type)
  WHERE doc_type IN ('registration', 'insurance');

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_documents_driver ON public.vehicle_documents;
CREATE POLICY vehicle_documents_driver ON public.vehicle_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_documents.vehicle_id AND v.driver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS vehicle_documents_staff ON public.vehicle_documents;
CREATE POLICY vehicle_documents_staff ON public.vehicle_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin', 'staff')
    )
  );
