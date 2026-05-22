export type LoyaltyPackage = {
  id: string;
  min_spend_cad: number;
  points: number;
};

export type ReferralInviteRule = {
  invites_required: number;
  referrer_bonus_cad: number;
  joined_user_bonus_cad: number;
  /** Min. first order amount (CAD) for referrer first-purchase bonus */
  first_purchase_min_amount_cad: number;
  referrer_bonus_first_purchase_cad: number;
  joined_driver_earn_threshold_cad: number;
  referrer_bonus_driver_earned_cad: number;
};

export type ClientProgramConfig = {
  loyalty: {
    points_per_dollar: number;
    packages: LoyaltyPackage[];
  };
  referrals: {
    invite_client: ReferralInviteRule;
    invite_driver: ReferralInviteRule;
  };
};

export type DriverProgramConfig = {
  referrals: {
    invite_client: ReferralInviteRule;
    invite_driver: ReferralInviteRule;
  };
};

const DEFAULT_INVITE_RULE: ReferralInviteRule = {
  invites_required: 5,
  referrer_bonus_cad: 10,
  joined_user_bonus_cad: 8,
  first_purchase_min_amount_cad: 5,
  referrer_bonus_first_purchase_cad: 5,
  joined_driver_earn_threshold_cad: 500,
  referrer_bonus_driver_earned_cad: 15,
};

export const DEFAULT_CLIENT_PROGRAM: ClientProgramConfig = {
  loyalty: {
    points_per_dollar: 1000,
    packages: [
      { id: "lp-5", min_spend_cad: 5, points: 50 },
      { id: "lp-10", min_spend_cad: 10, points: 100 },
      { id: "lp-25", min_spend_cad: 25, points: 300 },
    ],
  },
  referrals: {
    invite_client: {
      invites_required: 5,
      referrer_bonus_cad: 10,
      joined_user_bonus_cad: 8,
      first_purchase_min_amount_cad: 5,
      referrer_bonus_first_purchase_cad: 5,
      joined_driver_earn_threshold_cad: 0,
      referrer_bonus_driver_earned_cad: 0,
    },
    invite_driver: {
      invites_required: 3,
      referrer_bonus_cad: 25,
      joined_user_bonus_cad: 15,
      first_purchase_min_amount_cad: 0,
      referrer_bonus_first_purchase_cad: 0,
      joined_driver_earn_threshold_cad: 500,
      referrer_bonus_driver_earned_cad: 20,
    },
  },
};

export const DEFAULT_DRIVER_PROGRAM: DriverProgramConfig = {
  referrals: {
    invite_client: {
      invites_required: 5,
      referrer_bonus_cad: 15,
      joined_user_bonus_cad: 10,
      first_purchase_min_amount_cad: 5,
      referrer_bonus_first_purchase_cad: 8,
      joined_driver_earn_threshold_cad: 0,
      referrer_bonus_driver_earned_cad: 0,
    },
    invite_driver: {
      invites_required: 3,
      referrer_bonus_cad: 30,
      joined_user_bonus_cad: 20,
      first_purchase_min_amount_cad: 0,
      referrer_bonus_first_purchase_cad: 0,
      joined_driver_earn_threshold_cad: 750,
      referrer_bonus_driver_earned_cad: 25,
    },
  },
};

function parseInviteRule(raw: unknown, fallback: ReferralInviteRule): ReferralInviteRule {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const legacy = raw as { condition?: number; targetBonus?: number };
  return {
    invites_required: Number(
      o.invites_required ?? legacy.condition ?? fallback.invites_required,
    ),
    referrer_bonus_cad: Number(
      o.referrer_bonus_cad ?? legacy.targetBonus ?? fallback.referrer_bonus_cad,
    ),
    joined_user_bonus_cad: Number(
      o.joined_user_bonus_cad ?? o.refereeBonusCad ?? fallback.joined_user_bonus_cad,
    ),
    first_purchase_min_amount_cad: Number(
      o.first_purchase_min_amount_cad ?? fallback.first_purchase_min_amount_cad,
    ),
    referrer_bonus_first_purchase_cad: Number(
      o.referrer_bonus_first_purchase_cad ?? fallback.referrer_bonus_first_purchase_cad,
    ),
    joined_driver_earn_threshold_cad: Number(
      o.joined_driver_earn_threshold_cad ?? fallback.joined_driver_earn_threshold_cad,
    ),
    referrer_bonus_driver_earned_cad: Number(
      o.referrer_bonus_driver_earned_cad ?? fallback.referrer_bonus_driver_earned_cad,
    ),
  };
}

function parseLoyaltyPackages(raw: unknown): LoyaltyPackage[] {
  if (!Array.isArray(raw)) return DEFAULT_CLIENT_PROGRAM.loyalty.packages;
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      return {
        id: String(o.id ?? `lp-${i}`),
        min_spend_cad: Number(o.min_spend_cad ?? o.minSpendCad ?? 0),
        points: Number(o.points ?? 0),
      };
    })
    .filter((p): p is LoyaltyPackage => p != null && p.min_spend_cad > 0)
    .sort((a, b) => a.min_spend_cad - b.min_spend_cad);
}

export function normalizeClientProgram(raw: Record<string, unknown>): ClientProgramConfig {
  if (raw.loyalty && raw.referrals) {
    const loyalty = raw.loyalty as Record<string, unknown>;
    const refs = raw.referrals as Record<string, unknown>;
    return {
      loyalty: {
        points_per_dollar: Number(
          loyalty.points_per_dollar ?? loyalty.pointsPerDollar ?? 1000,
        ),
        packages: parseLoyaltyPackages(loyalty.packages),
      },
      referrals: {
        invite_client: parseInviteRule(
          refs.invite_client ?? refs.clientInviteClient,
          DEFAULT_CLIENT_PROGRAM.referrals.invite_client,
        ),
        invite_driver: parseInviteRule(
          refs.invite_driver ?? refs.clientInviteDriver,
          DEFAULT_CLIENT_PROGRAM.referrals.invite_driver,
        ),
      },
    };
  }
  return {
    loyalty: {
      points_per_dollar: Number(raw.pointsPerDollar ?? 1000),
      packages: parseLoyaltyPackages(raw.loyaltyPackages ?? DEFAULT_CLIENT_PROGRAM.loyalty.packages),
    },
    referrals: {
      invite_client: parseInviteRule(
        raw.clientInviteClient,
        DEFAULT_CLIENT_PROGRAM.referrals.invite_client,
      ),
      invite_driver: parseInviteRule(
        raw.clientInviteDriver,
        DEFAULT_CLIENT_PROGRAM.referrals.invite_driver,
      ),
    },
  };
}

export function normalizeDriverProgram(raw: Record<string, unknown>): DriverProgramConfig {
  if (raw.referrals) {
    const refs = raw.referrals as Record<string, unknown>;
    return {
      referrals: {
        invite_client: parseInviteRule(
          refs.invite_client ?? refs.driverInviteClient,
          DEFAULT_DRIVER_PROGRAM.referrals.invite_client,
        ),
        invite_driver: parseInviteRule(
          refs.invite_driver ?? refs.driverInviteDriver,
          DEFAULT_DRIVER_PROGRAM.referrals.invite_driver,
        ),
      },
    };
  }
  return {
    referrals: {
      invite_client: parseInviteRule(
        raw.driverInviteClient ?? raw.clientInviteClient,
        DEFAULT_DRIVER_PROGRAM.referrals.invite_client,
      ),
      invite_driver: parseInviteRule(
        raw.driverInviteDriver ?? raw.clientInviteDriver,
        DEFAULT_DRIVER_PROGRAM.referrals.invite_driver,
      ),
    },
  };
}

export function newLoyaltyPackageId() {
  return `lp-${Date.now().toString(36)}`;
}
