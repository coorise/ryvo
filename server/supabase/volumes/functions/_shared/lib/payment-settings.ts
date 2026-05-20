import { getAdminClient } from "./supabase.ts";

export type PaymentSettingsConfig = {
  currency: string;
  stripeMode: "test" | "live";
  stripePublishableKey?: string;
  platformFeePercent: number;
  driverPayoutDelayDays: number;
  minTripFare: number;
  cancellationFee: number;
  autoCapture: boolean;
  tipsEnabled: boolean;
  requirePreauth: boolean;
};

const DEFAULT_CONFIG: PaymentSettingsConfig = {
  currency: "CAD",
  stripeMode: "test",
  platformFeePercent: 20,
  driverPayoutDelayDays: 2,
  minTripFare: 5,
  cancellationFee: 5,
  autoCapture: true,
  tipsEnabled: true,
  requirePreauth: true,
};

export async function getPaymentSettings(): Promise<PaymentSettingsConfig> {
  const db = getAdminClient();
  const { data } = await db
    .from("payment_settings")
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  if (!data?.config || typeof data.config !== "object") return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...(data.config as PaymentSettingsConfig) };
}

export async function updatePaymentSettings(
  config: Partial<PaymentSettingsConfig>,
  updatedBy: string,
): Promise<PaymentSettingsConfig> {
  const merged = { ...(await getPaymentSettings()), ...config };
  const db = getAdminClient();
  const { error } = await db.from("payment_settings").upsert({
    id: "default",
    config: merged,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return merged;
}
