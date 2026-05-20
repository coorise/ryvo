import { BaseService } from "@/lib/base-service";

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

  getTariffs(token: string | null) {
    return this.get<{ packages: TariffPackage[] }>("/v1/admin/finance/tariffs", token);
  }

  updateTariff(token: string | null, id: string, body: Partial<TariffPackage>) {
    return this.put(`/v1/admin/finance/tariffs/${id}`, body, token);
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

export type TariffPackage = {
  id: string;
  code: string;
  name: string;
  package_type: string;
  commission_percent: number;
  subscription_monthly: number | null;
  payout_cadence: string;
  search_boost: number;
  is_optional_subscription: boolean;
  active: boolean;
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
