-- Referrals v2: bonus ledger, referral campaigns, loyalty conversion settings

CREATE TABLE IF NOT EXISTS public.bonus_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('client', 'driver')),
  channel text NOT NULL DEFAULT 'manual' CHECK (channel IN ('link', 'coupon', 'loyalty', 'manual')),
  balance numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_type)
);

CREATE TABLE IF NOT EXISTS public.referral_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_role text NOT NULL CHECK (referrer_role IN ('client', 'driver')),
  invitation_type text NOT NULL CHECK (invitation_type IN ('client', 'driver')),
  channel text NOT NULL DEFAULT 'link' CHECK (channel IN ('link', 'coupon', 'manual')),
  coupon_code text,
  condition_required int NOT NULL DEFAULT 1,
  target_bonus numeric(12,2) NOT NULL DEFAULT 0,
  goal text NOT NULL DEFAULT 'pending' CHECK (goal IN ('pending', 'achieved')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_campaign_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.referral_campaigns(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_accounts_type ON public.bonus_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_referral_campaigns_roles ON public.referral_campaigns(referrer_role, invitation_type);

-- Enrich default settings with conversion + per-invite rules
UPDATE public.referral_settings
SET
  client_config = client_config || jsonb_build_object(
    'pointsPerDollar', COALESCE((client_config->>'pointsPerDollar')::int, 1000),
    'clientInviteClient', COALESCE(client_config->'clientInviteClient', jsonb_build_object('condition', 5, 'targetBonus', 10)),
    'clientInviteDriver', COALESCE(client_config->'clientInviteDriver', jsonb_build_object('condition', 3, 'targetBonus', 25)),
    'driverInviteClient', COALESCE(client_config->'driverInviteClient', jsonb_build_object('condition', 5, 'targetBonus', 15)),
    'driverInviteDriver', COALESCE(client_config->'driverInviteDriver', jsonb_build_object('condition', 3, 'targetBonus', 30))
  ),
  driver_config = driver_config || jsonb_build_object(
    'pointsPerDollar', COALESCE((driver_config->>'pointsPerDollar')::int, 1000),
    'clientInviteClient', COALESCE(driver_config->'clientInviteClient', jsonb_build_object('condition', 5, 'targetBonus', 10)),
    'clientInviteDriver', COALESCE(driver_config->'clientInviteDriver', jsonb_build_object('condition', 3, 'targetBonus', 25)),
    'driverInviteClient', COALESCE(driver_config->'driverInviteClient', jsonb_build_object('condition', 5, 'targetBonus', 15)),
    'driverInviteDriver', COALESCE(driver_config->'driverInviteDriver', jsonb_build_object('condition', 3, 'targetBonus', 30))
  )
WHERE id = 'default';

-- Backfill bonus accounts from loyalty + credited referral bonuses
INSERT INTO public.bonus_accounts (user_id, account_type, channel, balance, updated_at)
SELECT user_id, 'client', 'loyalty', cash_balance, updated_at
FROM public.loyalty_points
WHERE cash_balance > 0
ON CONFLICT (user_id, account_type) DO UPDATE
  SET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;

INSERT INTO public.bonus_accounts (user_id, account_type, channel, balance, updated_at)
SELECT referrer_id, 'driver', 'link', SUM(bonus_earned), MAX(created_at)
FROM public.referral_entries
WHERE role = 'driver' AND status = 'credited'
GROUP BY referrer_id
ON CONFLICT (user_id, account_type) DO UPDATE
  SET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;

-- Backfill campaigns from legacy referral_entries (one row per referrer + invitee type)
INSERT INTO public.referral_campaigns (
  referrer_id, referrer_role, invitation_type, channel, coupon_code,
  condition_required, target_bonus, goal, updated_at
)
SELECT
  e.referrer_id,
  e.role AS referrer_role,
  e.role AS invitation_type,
  e.channel,
  e.coupon_code,
  1,
  e.bonus_earned,
  CASE WHEN e.status = 'credited' THEN 'achieved' ELSE 'pending' END,
  e.created_at
FROM public.referral_entries e
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_campaigns c
  WHERE c.referrer_id = e.referrer_id AND c.invitation_type = e.role
);

INSERT INTO public.referral_campaign_joins (campaign_id, referee_id, joined_at)
SELECT c.id, e.referee_id, e.created_at
FROM public.referral_entries e
JOIN public.referral_campaigns c
  ON c.referrer_id = e.referrer_id AND c.invitation_type = e.role
ON CONFLICT (campaign_id, referee_id) DO NOTHING;
