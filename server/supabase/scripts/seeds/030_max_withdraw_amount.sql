-- Per-package maximum withdrawal cap (NULL = no limit)

ALTER TABLE public.driver_tariff_packages
  ADD COLUMN IF NOT EXISTS max_withdraw_amount numeric(12,2);
