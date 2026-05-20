import { BaseService } from "@/lib/base-service";
import {
  normalizeCardDisplay,
  normalizeFeatures,
  type TariffPackage,
  type TariffPackageInput,
} from "@/lib/tariff-types";

export type { TariffPackage, TariffPackageInput, TariffFeatures } from "@/lib/tariff-types";

function mapTariff(row: Record<string, unknown>): TariffPackage {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    package_type: String(row.package_type),
    description: row.description != null ? String(row.description) : null,
    commission_percent: Number(row.commission_percent),
    subscription_monthly:
      row.subscription_monthly != null ? Number(row.subscription_monthly) : null,
    payout_cadence: String(row.payout_cadence),
    payout_delay_minutes: Number(row.payout_delay_minutes ?? 0),
    quota_trips: row.quota_trips != null ? Number(row.quota_trips) : null,
    discount_percent: Number(row.discount_percent ?? 0),
    search_boost: Number(row.search_boost ?? 0),
    is_optional_subscription: Boolean(row.is_optional_subscription),
    is_system: Boolean(row.is_system),
    active: Boolean(row.active),
    features: normalizeFeatures(row.features),
    card_display: normalizeCardDisplay(row.card_display),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

function bodyToApi(body: TariffPackageInput) {
  return {
    code: body.code,
    name: body.name,
    package_type: body.package_type,
    description: body.description || null,
    commission_percent: body.commission_percent,
    subscription_monthly: body.is_optional_subscription ? body.subscription_monthly : null,
    payout_cadence: body.payout_cadence,
    payout_delay_minutes: body.payout_delay_minutes,
    quota_trips: body.package_type === "per_quota" ? body.quota_trips : null,
    discount_percent: body.discount_percent,
    search_boost: body.search_boost,
    is_optional_subscription: body.is_optional_subscription,
    active: body.active,
    features: body.features,
    card_display: body.card_display,
  };
}

export class FinanceService extends BaseService {
  constructor() {
    super("auth-hooks");
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
    return this.get<{
      referrals: ReferralEntry[];
      loyalty: LoyaltyRow[];
    }>("/v1/admin/finance/referrals", token);
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

  getCheckouts(token: string | null, status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.get<{ sessions: CheckoutSession[] }>(`/v1/admin/finance/checkouts${q}`, token);
  }
}

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

export type LoyaltyRow = {
  user_id: string;
  points: number;
  cash_balance: number;
  updated_at: string;
};

export type PaycheckStatus = "pending" | "paid" | "held" | "cancelled";

export type PaycheckRow = {
  id: string;
  driver_id: string;
  amount: number;
  currency: string;
  status: PaycheckStatus;
  period_label: string | null;
  auto_pay: boolean;
  paid_at: string | null;
  note: string | null;
  created_at: string;
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
