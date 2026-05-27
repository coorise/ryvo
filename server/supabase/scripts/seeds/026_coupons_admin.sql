-- Promo coupons: validity window, bonus amount, one redemption per client

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_user_unique UNIQUE (coupon_id, user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON public.coupons(active, starts_at, expires_at);

INSERT INTO public.coupons (code, discount_type, discount_value, starts_at, expires_at, active)
VALUES ('WELCOME10', 'fixed', 10, now() - interval '1 day', now() + interval '90 days', true)
ON CONFLICT (code) DO NOTHING;
