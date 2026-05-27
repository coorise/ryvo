-- Normalize referral_settings to client/driver program structure (v3)

UPDATE public.referral_settings
SET client_config = jsonb_build_object(
  'loyalty', jsonb_build_object(
    'points_per_dollar', COALESCE((client_config->>'pointsPerDollar')::int, 1000),
    'packages', COALESCE(
      client_config->'loyalty'->'packages',
      '[
        {"id":"lp-5","min_spend_cad":5,"points":50},
        {"id":"lp-10","min_spend_cad":10,"points":100},
        {"id":"lp-25","min_spend_cad":25,"points":300}
      ]'::jsonb
    )
  ),
  'referrals', jsonb_build_object(
    'invite_client', jsonb_build_object(
      'invites_required', COALESCE((client_config->'clientInviteClient'->>'condition')::int, 5),
      'referrer_bonus_cad', COALESCE((client_config->'clientInviteClient'->>'targetBonus')::numeric, 10),
      'joined_user_bonus_cad', COALESCE((client_config->>'refereeBonusCad')::numeric, 8),
      'referrer_bonus_first_purchase_cad', 5,
      'referrer_bonus_driver_earned_cad', 0,
      'joined_driver_earn_threshold_cad', 0
    ),
    'invite_driver', jsonb_build_object(
      'invites_required', COALESCE((client_config->'clientInviteDriver'->>'condition')::int, 3),
      'referrer_bonus_cad', COALESCE((client_config->'clientInviteDriver'->>'targetBonus')::numeric, 25),
      'joined_user_bonus_cad', 15,
      'referrer_bonus_first_purchase_cad', 0,
      'referrer_bonus_driver_earned_cad', 20,
      'joined_driver_earn_threshold_cad', 500
    )
  )
),
driver_config = jsonb_build_object(
  'referrals', jsonb_build_object(
    'invite_client', jsonb_build_object(
      'invites_required', COALESCE((driver_config->'driverInviteClient'->>'condition')::int, 5),
      'referrer_bonus_cad', COALESCE((driver_config->'driverInviteClient'->>'targetBonus')::numeric, 15),
      'joined_user_bonus_cad', 10,
      'referrer_bonus_first_purchase_cad', 8,
      'referrer_bonus_driver_earned_cad', 0,
      'joined_driver_earn_threshold_cad', 0
    ),
    'invite_driver', jsonb_build_object(
      'invites_required', COALESCE((driver_config->'driverInviteDriver'->>'condition')::int, 3),
      'referrer_bonus_cad', COALESCE((driver_config->'driverInviteDriver'->>'targetBonus')::numeric, 30),
      'joined_user_bonus_cad', 20,
      'referrer_bonus_first_purchase_cad', 0,
      'referrer_bonus_driver_earned_cad', 25,
      'joined_driver_earn_threshold_cad', 750
    )
  )
)
WHERE id = 'default';
