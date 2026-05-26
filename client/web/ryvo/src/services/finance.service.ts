import { BaseService } from "@/lib/base-service";
import { apiRequest } from "@/lib/api-client";
import {
  normalizeCardDisplay,
  normalizeFeatures,
  type TariffPackage,
  type TariffPackageInput,
} from "@/lib/tariff-types";

export type { TariffPackage, TariffPackageInput, TariffFeatures } from "@/lib/tariff-types";

function mapTariff(row: Record<string, unknown>): TariffPackage {
  const payoutLabel = row.payout_label === "days" ? "days" : "instant";
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    package_type: String(row.package_type),
    description: row.description != null ? String(row.description) : null,
    commission_percent: Number(row.commission_percent),
    subscription_monthly:
      row.subscription_monthly != null ? Number(row.subscription_monthly) : null,
    recurrence_count:
      row.recurrence_count != null ? Number(row.recurrence_count) : null,
    recurrence_unlimited: row.recurrence_count == null,
    valid_until: row.valid_until != null ? String(row.valid_until) : null,
    valid_unlimited: row.valid_until == null,
    min_withdraw_amount: Number(row.min_withdraw_amount ?? 25),
    max_withdraw_amount:
      row.max_withdraw_amount != null ? Number(row.max_withdraw_amount) : null,
    max_withdraw_unlimited: row.max_withdraw_amount == null,
    payout_label: payoutLabel,
    payout_delay_minutes: Number(row.payout_delay_minutes ?? 0),
    payout_delay_days: Number(row.payout_delay_days ?? 0),
    payout_custom_label:
      row.payout_custom_label != null ? String(row.payout_custom_label) : null,
    payout_cadence: String(row.payout_cadence ?? payoutLabel),
    quota_trips: row.quota_trips != null ? Number(row.quota_trips) : null,
    discount_percent: Number(row.discount_percent ?? 0),
    search_boost: Number(row.search_boost ?? 0),
    is_optional_subscription: Boolean(row.is_optional_subscription),
    billing_mode:
      row.billing_mode === "subscription" ? "subscription" : ("one_time" as const),
    is_basic: Boolean(row.is_basic),
    is_system: Boolean(row.is_system),
    active: Boolean(row.active),
    features: normalizeFeatures(row.features),
    card_display: normalizeCardDisplay(row.card_display),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

function bodyToApi(body: TariffPackageInput) {
  const payoutCadence =
    body.payout_label === "days"
      ? `days_${body.payout_delay_days}`
      : `instant_${body.payout_delay_minutes}`;
  return {
    code: body.code,
    name: body.name,
    package_type: body.package_type,
    description: body.description || null,
    commission_percent: body.commission_percent,
    subscription_monthly: body.code === "basic" ? 0 : body.subscription_monthly,
    recurrence_count: body.recurrence_unlimited ? null : body.recurrence_count,
    valid_until: body.valid_unlimited ? null : body.valid_until,
    min_withdraw_amount: body.min_withdraw_amount,
    max_withdraw_amount: body.max_withdraw_unlimited ? null : body.max_withdraw_amount,
    payout_label: body.payout_label,
    payout_delay_minutes: body.payout_delay_minutes,
    payout_delay_days: body.payout_delay_days,
    payout_custom_label: body.payout_custom_label,
    payout_cadence: payoutCadence,
    quota_trips: null,
    discount_percent: body.discount_percent,
    search_boost: body.features.search_priority_rank,
    is_optional_subscription: body.code !== "basic",
    billing_mode: body.code === "basic" ? "one_time" : "subscription",
    is_basic: body.is_basic,
    active: body.active,
    features: body.features,
    card_display: body.card_display,
  };
}

export class FinanceService extends BaseService {
  constructor() {
    super("payout-service");
  }

  getReferralSettings(token: string | null) {
    return this.get<{
      client_config: Record<string, unknown>;
      driver_config: Record<string, unknown>;
    }>("/v1/admin/finance/referrals/settings", token);
  }

  updateReferralSettings(
    token: string | null,
    body: { client_config: Record<string, unknown>; driver_config: Record<string, unknown> },
  ) {
    return this.patch("/v1/admin/finance/referrals/settings", body, token);
  }

  getReferrals(token: string | null) {
    return this.get<ReferralsBundle>("/v1/admin/finance/referrals", token);
  }

  getCoupons(token: string | null) {
    return apiRequest<CouponsBundle>(
      "coupon-service",
      "/v1/admin/finance/coupons",
      { token },
    );
  }

  createCoupon(
    token: string | null,
    body: {
      code: string;
      bonus_cad: number;
      starts_at?: string | null;
      ends_at?: string | null;
      active?: boolean;
    },
  ) {
    return apiRequest<{ coupon: CouponRow }>(
      "coupon-service",
      "/v1/admin/finance/coupons",
      { method: "POST", body, token },
    );
  }

  updateCoupon(
    token: string | null,
    id: string,
    body: Partial<{
      code: string;
      bonus_cad: number;
      starts_at: string | null;
      ends_at: string | null;
      active: boolean;
    }>,
  ) {
    return apiRequest<{ coupon: CouponRow }>(
      "coupon-service",
      `/v1/admin/finance/coupons/${id}`,
      { method: "PATCH", body, token },
    );
  }

  deleteCoupon(token: string | null, id: string) {
    return apiRequest<{ deleted: boolean }>(
      "coupon-service",
      `/v1/admin/finance/coupons/${id}`,
      { method: "DELETE", token },
    );
  }

  validateCoupon(token: string | null, code: string, fare: number) {
    return apiRequest<{ code: string; bonus_cad: number; discount: number }>(
      "coupon-service",
      "/v1/finance/coupons/validate",
      { method: "POST", body: { code, fare }, token },
    );
  }

  redeemCoupon(token: string | null, code: string, tripId?: string | null) {
    return apiRequest<{ code: string; bonus_cad: number }>(
      "coupon-service",
      "/v1/finance/coupons/redeem",
      { method: "POST", body: { code, trip_id: tripId ?? null }, token },
    );
  }

  createBonus(
    token: string | null,
    body: { email: string; account_type: "client" | "driver"; channel?: string; balance: number },
  ) {
    return this.post<{ bonus: BonusAccountRow }>("/v1/admin/finance/referrals/bonuses", body, token);
  }

  updateBonus(
    token: string | null,
    id: string,
    body: { channel?: string; balance?: number },
  ) {
    return this.patch<{ bonus: BonusAccountRow }>(
      `/v1/admin/finance/referrals/bonuses/${id}`,
      body,
      token,
    );
  }

  deleteBonus(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/finance/referrals/bonuses/${id}`, token);
  }

  createLoyalty(token: string | null, body: { email: string; points: number }) {
    return this.post<{ loyalty: LoyaltyRowEnriched }>(
      "/v1/admin/finance/referrals/loyalty",
      body,
      token,
    );
  }

  createCampaign(
    token: string | null,
    body: {
      referrer_email: string;
      referrer_role: "client" | "driver";
      invitation_type: "client" | "driver";
      channel: "link" | "coupon" | "manual";
      condition_required: number;
      target_bonus: number;
      goal?: "pending" | "achieved";
      joined_emails?: string[];
    },
  ) {
    return this.post<{ campaign: ReferralCampaignRow }>(
      "/v1/admin/finance/referrals/campaigns",
      body,
      token,
    );
  }

  updateCampaign(
    token: string | null,
    id: string,
    body: {
      channel?: string;
      condition_required?: number;
      target_bonus?: number;
      goal?: "pending" | "achieved";
    },
  ) {
    return this.patch<{ campaign: ReferralCampaignRow }>(
      `/v1/admin/finance/referrals/campaigns/${id}`,
      body,
      token,
    );
  }

  deleteCampaign(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(
      `/v1/admin/finance/referrals/campaigns/${id}`,
      token,
    );
  }

  async getTariffs(token: string | null) {
    const res = await this.get<{ packages: Record<string, unknown>[] }>(
      "/v1/admin/finance/tariffs",
      token,
    );
    return { packages: (res.packages ?? []).map(mapTariff) };
  }

  createTariff(token: string | null, body: TariffPackageInput) {
    return this.post<{ package: Record<string, unknown> }>(
      "/v1/admin/finance/tariffs",
      bodyToApi(body),
      token,
    ).then((r) => ({ package: mapTariff(r.package) }));
  }

  updateTariff(token: string | null, id: string, body: TariffPackageInput) {
    return this.put<{ package: Record<string, unknown> }>(
      `/v1/admin/finance/tariffs/${id}`,
      bodyToApi(body),
      token,
    ).then((r) => ({ package: mapTariff(r.package) }));
  }

  deleteTariff(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/finance/tariffs/${id}`, token);
  }

  getPaychecks(token: string | null, status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.get<{ paychecks: PaycheckRow[] }>(`/v1/admin/finance/paychecks${q}`, token);
  }

  createPaycheck(
    token: string | null,
    body: { driver_id: string; amount: number; period_label?: string; note?: string },
  ) {
    return this.post<{ paycheck: PaycheckRow }>("/v1/admin/finance/paychecks", body, token);
  }

  updatePaycheckStatus(token: string | null, id: string, status: PaycheckStatus) {
    return this.patch<{ paycheck: PaycheckRow }>(
      `/v1/admin/finance/paychecks/${id}`,
      { status },
      token,
    );
  }

  patchPaycheck(
    token: string | null,
    id: string,
    body: {
      status?: PaycheckStatus;
      amount?: number;
      action?: "hold" | "resume" | "cancel" | "pay";
      reason?: string;
      notify?: boolean;
    },
  ) {
    return this.patch<{ paycheck: PaycheckRow }>(`/v1/admin/finance/paychecks/${id}`, body, token);
  }

  deletePaycheck(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/finance/paychecks/${id}`, token);
  }

  getTariffSubscriptions(token: string | null, status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.get<{ subscriptions: TariffSubscriptionRow[] }>(
      `/v1/admin/finance/tariff-subscriptions${q}`,
      token,
    );
  }

  createTariffSubscription(
    token: string | null,
    body: { driver_id: string; tariff_package_id: string; notify?: boolean },
  ) {
    return this.post<{ subscription: TariffSubscriptionRow }>(
      "/v1/admin/finance/tariff-subscriptions",
      body,
      token,
    );
  }

  patchTariffSubscription(
    token: string | null,
    id: string,
    body:
      | { action: "hold" | "resume" | "cancel"; reason?: string; notify?: boolean }
      | { action: "migrate"; tariff_package_id: string; notify?: boolean },
  ) {
    return this.patch<{ subscription: TariffSubscriptionRow }>(
      `/v1/admin/finance/tariff-subscriptions/${id}`,
      body,
      token,
    );
  }

  getDriverEarnings(token: string | null) {
    return this.get<{ earnings: DriverEarningRow[] }>(
      "/v1/admin/finance/driver-earnings",
      token,
    );
  }

  adjustDriverEarning(
    token: string | null,
    driverId: string,
    body: { delta?: number; balance?: number },
  ) {
    return this.patch<{ earning: { driver_id: string; balance: number } }>(
      `/v1/admin/finance/driver-earnings/${driverId}`,
      body,
      token,
    );
  }

  queuePaycheckFromEarnings(token: string | null, driverId: string, amount: number) {
    return this.post<{ paycheck: PaycheckRow }>(
      `/v1/admin/finance/driver-earnings/${driverId}/queue-paycheck`,
      { amount },
      token,
    );
  }

  deleteTariffSubscription(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/finance/tariff-subscriptions/${id}`, token);
  }

  getCheckouts(token: string | null, status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.get<{ sessions: CheckoutSession[] }>(`/v1/admin/finance/checkouts${q}`, token);
  }

  deleteCheckout(token: string | null, id: string) {
    return this.delete<{ deleted: boolean }>(`/v1/admin/finance/checkouts/${id}`, token);
  }

  scheduleCheckoutRecovery(
    token: string | null,
    id: string,
    body: {
      message: string;
      send_email: boolean;
      send_push: boolean;
      delay_minutes: number;
    },
  ) {
    return this.post<{ reminder: CheckoutRecoveryReminder }>(
      `/v1/admin/finance/checkouts/${id}/recovery-reminder`,
      body,
      token,
    );
  }
}

export type CheckoutRecoveryReminder = {
  id: string;
  checkout_session_id: string;
  client_id: string;
  message: string;
  send_email: boolean;
  send_push: boolean;
  send_at: string;
  status: string;
  created_at: string;
};

export type BonusAccountRow = {
  id: string;
  user_id: string;
  email: string;
  account_type: "client" | "driver";
  channel: string;
  balance: number;
  updated_at: string;
};

export type LoyaltyRowEnriched = {
  user_id: string;
  email: string;
  points: number;
  cash_balance: number;
  updated_at: string;
};

export type ReferralCampaignRow = {
  id: string;
  referrer_id: string;
  referrer_email: string;
  referrer_role: "client" | "driver";
  invitation_type: "client" | "driver";
  channel: string;
  coupon_code: string | null;
  condition_required: number;
  target_bonus: number;
  goal: "pending" | "achieved";
  updated_at: string;
  joined_emails: string[];
  joined_count: number;
};

export type CouponRow = {
  id: string;
  code: string;
  bonus_cad: number;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
  created_at: string;
  active: boolean;
  redemption_count: number;
};

export type CouponRedemptionRow = {
  id: string;
  user_id: string;
  email: string;
  code: string;
  bonus_cad: number;
  created_at: string;
};

export type CouponsBundle = {
  coupons: CouponRow[];
  redemptions: CouponRedemptionRow[];
};

export type ReferralsBundle = {
  clientBonuses: BonusAccountRow[];
  driverBonuses: BonusAccountRow[];
  loyalty: LoyaltyRowEnriched[];
  clientCampaigns: ReferralCampaignRow[];
  driverCampaigns: ReferralCampaignRow[];
};

/** @deprecated legacy row shape */
export type ReferralEntry = {
  id: string;
  referrer_id: string;
  referee_id: string;
  role: "client" | "driver";
  channel: "link" | "coupon";
  coupon_code: string | null;
  bonus_earned: number;
  status: string;
  created_at: string;
};

export type LoyaltyRow = LoyaltyRowEnriched;

export type PaycheckStatus = "pending" | "paid" | "held" | "cancelled";

export type PaycheckRow = {
  id: string;
  driver_id: string;
  driver_email?: string;
  amount: number;
  currency: string;
  status: PaycheckStatus;
  period_label: string | null;
  period_remaining?: string;
  auto_pay: boolean;
  paid_at: string | null;
  note: string | null;
  hold_reason?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  tariff_package_id?: string | null;
  tariff_name?: string | null;
  transfer_due_at?: string | null;
  is_subscription?: boolean;
  source?: string;
};

export type TariffSubscriptionRow = {
  id: string;
  driver_id: string;
  driver_email: string;
  tariff_package_id: string;
  tariff_name: string;
  tariff_code: string;
  billing_mode: string;
  subscription_monthly: number | null;
  status: "active" | "held" | "cancelled";
  hold_reason: string | null;
  started_at: string;
  ends_at: string | null;
  next_paycheck_at: string | null;
  payout_cadence: string | null;
  is_basic?: boolean;
};

export type DriverEarningRow = {
  driver_id: string;
  driver_email: string;
  balance: number;
  tariff_name: string | null;
  tariff_code: string | null;
  updated_at: string;
};

export type CheckoutSession = {
  id: string;
  client_id: string;
  driver_id: string | null;
  status: "open" | "completed" | "cancelled" | "abandoned";
  pickup_address: string | null;
  dropoff_address: string | null;
  fare_estimate: number | null;
  planned_at: string | null;
  last_event_at: string;
  created_at: string;
};

export const financeService = new FinanceService();
