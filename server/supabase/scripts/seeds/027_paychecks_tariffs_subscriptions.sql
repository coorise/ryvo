-- Paychecks: tariff link, transfer due, subscription flag, payout queue
-- Tariffs: billing mode (subscription vs one-time)
-- Driver tariff subscriptions for admin-managed recurring packages

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'one_time'
    CHECK (billing_mode IN ('subscription', 'one_time'));

UPDATE public.driver_tariff_packages
SET billing_mode = CASE
  WHEN is_optional_subscription = true OR package_type IN ('essential', 'pro') THEN 'subscription'
  ELSE 'one_time'
END;

ALTER TABLE public.driver_paychecks
  ADD COLUMN IF NOT EXISTS tariff_package_id uuid REFERENCES public.driver_tariff_packages(id),
  ADD COLUMN IF NOT EXISTS transfer_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('subscription', 'driver', 'manual', 'admin')),
  ADD COLUMN IF NOT EXISTS in_payout_queue boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.driver_tariff_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id),
  tariff_package_id uuid NOT NULL REFERENCES public.driver_tariff_packages(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'held', 'cancelled')),
  hold_reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  next_paycheck_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, tariff_package_id)
);

CREATE INDEX IF NOT EXISTS idx_paychecks_status_queue
  ON public.driver_paychecks(status, in_payout_queue)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.driver_tariff_subscriptions(status);

INSERT INTO public.permissions (name, description) VALUES
  ('finances:subscriptions:read', 'View driver tariff subscriptions'),
  ('finances:subscriptions:update', 'Manage driver tariff subscriptions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('super_admin', 'admin')
  AND p.name IN ('finances:subscriptions:read', 'finances:subscriptions:update')
ON CONFLICT DO NOTHING;
