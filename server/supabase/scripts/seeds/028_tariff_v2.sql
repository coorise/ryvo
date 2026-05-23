-- Tariff v2: subscription recurrences, withdrawal timing, 4 core packages, driver earnings

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS recurrence_count int,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS min_withdraw_amount numeric(12,2) NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS payout_label text NOT NULL DEFAULT 'instant'
    CHECK (payout_label IN ('instant', 'days')),
  ADD COLUMN IF NOT EXISTS payout_delay_days int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_custom_label text,
  ADD COLUMN IF NOT EXISTS is_basic boolean NOT NULL DEFAULT false;

ALTER TABLE public.driver_tariff_packages DROP CONSTRAINT IF EXISTS driver_tariff_packages_package_type_check;

CREATE TABLE IF NOT EXISTS public.driver_earnings (
  driver_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Remove legacy batch / per-trip packages
DELETE FROM public.driver_tariff_subscriptions
WHERE tariff_package_id IN (
  SELECT id FROM public.driver_tariff_packages
  WHERE code NOT IN ('basic', 'essential', 'pro', 'pro_plus')
);

DELETE FROM public.driver_paychecks
WHERE tariff_package_id IN (
  SELECT id FROM public.driver_tariff_packages
  WHERE code NOT IN ('basic', 'essential', 'pro', 'pro_plus')
);

DELETE FROM public.driver_tariff_packages
WHERE code NOT IN ('basic', 'essential', 'pro', 'pro_plus');

ALTER TABLE public.driver_tariff_packages ADD CONSTRAINT driver_tariff_packages_package_type_check
  CHECK (package_type IN ('basic', 'essential', 'pro', 'pro_plus', 'custom'));

INSERT INTO public.driver_tariff_packages (
  code, name, package_type, commission_percent, subscription_monthly,
  payout_cadence, payout_delay_minutes, search_boost, is_optional_subscription,
  billing_mode, active, is_system, is_basic,
  recurrence_count, valid_until, min_withdraw_amount,
  payout_label, payout_delay_days, payout_custom_label, discount_percent,
  features, description
) VALUES
  (
    'basic', 'Basic', 'basic', 25, 0,
    'instant', 0, 0, false, 'one_time', true, true, true,
    NULL, NULL, 25, 'instant', 0, 'Instant', 0,
    '{"search_priority":false,"promoted_listing":false,"media_gallery":false,"max_photos":0,"max_videos":0,"custom_badge":false,"badge_label":"","priority_support":false,"remove_ads":false,"search_priority_rank":999}'::jsonb,
    'Default plan for every new driver. No subscription fee.'
  ),
  (
    'essential', 'Essential', 'essential', 22, 29.99,
    'days', 0, 10, true, 'subscription', true, true, false,
    NULL, NULL, 20, 'days', 3, '3 business days', 5,
    '{"search_priority":true,"search_priority_rank":50,"promoted_listing":false,"media_gallery":true,"max_photos":3,"max_videos":0,"custom_badge":false,"badge_label":"","priority_support":false,"remove_ads":true,"search_boost":10}'::jsonb,
  'Lower commission with ad-free experience.'
  ),
  (
    'pro', 'Pro', 'pro', 15, 59.99,
    'instant', 30, 25, true, 'subscription', true, true, false,
    12, NULL, 15, 'instant', 0, 'Instant (30 min)', 10,
    '{"search_priority":true,"search_priority_rank":25,"promoted_listing":true,"media_gallery":true,"max_photos":8,"max_videos":2,"custom_badge":true,"badge_label":"Pro","priority_support":false,"remove_ads":true,"search_boost":25}'::jsonb,
    'Daily payout priority and promoted listing.'
  ),
  (
    'pro_plus', 'Pro+', 'pro_plus', 12, 89.99,
    'instant', 5, 40, true, 'subscription', true, true, false,
    NULL, NULL, 10, 'instant', 0, 'Instant (5 min)', 15,
    '{"search_priority":true,"search_priority_rank":10,"promoted_listing":true,"media_gallery":true,"max_photos":12,"max_videos":4,"custom_badge":true,"badge_label":"Pro+","priority_support":true,"remove_ads":true,"search_boost":40}'::jsonb,
    'Top tier: fastest withdrawals and highest visibility.'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  package_type = EXCLUDED.package_type,
  commission_percent = EXCLUDED.commission_percent,
  subscription_monthly = EXCLUDED.subscription_monthly,
  payout_cadence = EXCLUDED.payout_cadence,
  payout_delay_minutes = EXCLUDED.payout_delay_minutes,
  search_boost = EXCLUDED.search_boost,
  is_optional_subscription = EXCLUDED.is_optional_subscription,
  billing_mode = EXCLUDED.billing_mode,
  active = EXCLUDED.active,
  is_system = EXCLUDED.is_system,
  is_basic = EXCLUDED.is_basic,
  recurrence_count = EXCLUDED.recurrence_count,
  valid_until = EXCLUDED.valid_until,
  min_withdraw_amount = EXCLUDED.min_withdraw_amount,
  payout_label = EXCLUDED.payout_label,
  payout_delay_days = EXCLUDED.payout_delay_days,
  payout_custom_label = EXCLUDED.payout_custom_label,
  discount_percent = EXCLUDED.discount_percent,
  features = EXCLUDED.features,
  description = EXCLUDED.description,
  updated_at = now();

-- Ensure every driver has Basic subscription + earnings row
INSERT INTO public.driver_earnings (driver_id, balance)
SELECT u.id, 0
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = u.id AND r.name = 'driver'
)
ON CONFLICT (driver_id) DO NOTHING;

INSERT INTO public.driver_tariff_subscriptions (driver_id, tariff_package_id, status)
SELECT u.id, p.id, 'active'
FROM auth.users u
CROSS JOIN public.driver_tariff_packages p
WHERE p.code = 'basic'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.name = 'driver'
  )
ON CONFLICT (driver_id, tariff_package_id) DO NOTHING;
