-- Driver tariff packages: admin-editable features & payout timing

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quota_trips int,
  ADD COLUMN IF NOT EXISTS payout_delay_minutes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.driver_tariff_packages DROP CONSTRAINT IF EXISTS driver_tariff_packages_package_type_check;
ALTER TABLE public.driver_tariff_packages ADD CONSTRAINT driver_tariff_packages_package_type_check
  CHECK (package_type IN (
    'essential', 'pro', 'per_drive', 'per_quota', 'per_daily', 'per_weekly', 'per_monthly', 'custom'
  ));

UPDATE public.driver_tariff_packages SET is_system = true WHERE code IN (
  'essential', 'pro', 'per_drive', 'per_quota', 'per_daily', 'per_weekly', 'per_monthly'
);

UPDATE public.driver_tariff_packages SET
  payout_delay_minutes = CASE package_type
    WHEN 'per_drive' THEN 5
    WHEN 'per_quota' THEN 0
    WHEN 'per_daily' THEN 1440
    WHEN 'per_weekly' THEN 10080
    WHEN 'per_monthly' THEN 43200
    ELSE 0
  END,
  quota_trips = CASE WHEN package_type = 'per_quota' THEN 50 ELSE NULL END,
  features = CASE code
    WHEN 'essential' THEN jsonb_build_object(
      'search_priority', true, 'search_boost', 10, 'promoted_listing', false,
      'media_gallery', true, 'max_photos', 3, 'max_videos', 0, 'custom_badge', false,
      'badge_label', '', 'priority_support', false
    )
    WHEN 'pro' THEN jsonb_build_object(
      'search_priority', true, 'search_boost', 25, 'promoted_listing', true,
      'media_gallery', true, 'max_photos', 8, 'max_videos', 2, 'custom_badge', true,
      'badge_label', 'Pro', 'priority_support', true
    )
    ELSE jsonb_build_object('search_priority', false, 'search_boost', 0)
  END
WHERE features = '{}'::jsonb OR features IS NULL;
