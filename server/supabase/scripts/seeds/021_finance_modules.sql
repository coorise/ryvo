-- Finance: referrals, tariffs, paychecks, checkout funnel

CREATE TABLE IF NOT EXISTS public.referral_settings (
  id text PRIMARY KEY DEFAULT 'default',
  client_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  driver_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id),
  referee_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('client', 'driver')),
  channel text NOT NULL CHECK (channel IN ('link', 'coupon')),
  coupon_code text,
  bonus_earned numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'redeemed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  cash_balance numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_tariff_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  package_type text NOT NULL CHECK (
    package_type IN ('essential', 'pro', 'per_drive', 'per_quota', 'per_daily', 'per_weekly', 'per_monthly')
  ),
  commission_percent numeric(5,2) NOT NULL,
  subscription_monthly numeric(12,2),
  payout_cadence text NOT NULL,
  search_boost int NOT NULL DEFAULT 0,
  is_optional_subscription boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_paychecks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'held', 'cancelled')),
  period_label text,
  auto_pay boolean NOT NULL DEFAULT true,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id),
  driver_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled', 'abandoned')),
  pickup_address text,
  dropoff_address text,
  fare_estimate numeric(12,2),
  planned_at timestamptz,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.referral_settings (id, client_config, driver_config)
VALUES (
  'default',
  jsonb_build_object(
    'maxReferrals', 10,
    'referrerBonusCad', 5,
    'refereeBonusCad', 8,
    'applyOnNextCheckout', true,
    'minOrdersForLoyalty', 1
  ),
  jsonb_build_object(
    'maxReferrals', 5,
    'referrerBonusCad', 15,
    'commissionReductionPercent', 2,
    'minTripsToCredit', 3
  )
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.driver_tariff_packages (code, name, package_type, commission_percent, subscription_monthly, payout_cadence, search_boost, is_optional_subscription)
VALUES
  ('essential', 'Essential', 'essential', 22, 29.99, 'weekly', 10, true),
  ('pro', 'Pro', 'pro', 15, 59.99, 'daily', 25, true),
  ('per_drive', 'Per drive', 'per_drive', 20, 0, 'minutes_after_trip', 0, false),
  ('per_quota', 'Per quota (50 trips)', 'per_quota', 18, 0, 'end_of_quota', 0, false),
  ('per_daily', 'Daily batch', 'per_daily', 19, 0, 'daily', 0, false),
  ('per_weekly', 'Weekly batch', 'per_weekly', 17, 0, 'weekly', 0, false),
  ('per_monthly', 'Monthly batch', 'per_monthly', 16, 0, 'monthly', 0, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
  ('finances:referrals:read', 'View referral programs and bonus ledger'),
  ('finances:referrals:update', 'Edit referral rules and settings'),
  ('finances:tariffs:read', 'View driver tariff and commission packages'),
  ('finances:tariffs:update', 'Edit driver tariff packages'),
  ('finances:checkouts:read', 'View client checkout funnel sessions'),
  ('finances:paychecks:read', 'View driver paycheck queue'),
  ('finances:paychecks:update', 'Pay, hold, or cancel driver paychecks')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
  AND p.name LIKE 'finances:%'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'finances:referrals:read', 'finances:referrals:update',
  'finances:tariffs:read', 'finances:tariffs:update',
  'finances:checkouts:read', 'finances:paychecks:read', 'finances:paychecks:update'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
