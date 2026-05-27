import { getAdminClient } from "./supabase.ts";

export async function getBasicTariffId(): Promise<string> {
  const db = getAdminClient();
  const { data } = await db
    .from("driver_tariff_packages")
    .select("id")
    .eq("code", "basic")
    .single();
  if (!data?.id) throw new Error("Basic tariff package not configured");
  return String(data.id);
}

export function computeTransferDueAtFromTariff(tariff: Record<string, unknown>, from = new Date()): string {
  const label = String(tariff.payout_label ?? "instant");
  const d = new Date(from);
  if (label === "days") {
    const days = Math.max(0, Number(tariff.payout_delay_days ?? 0));
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  const mins = Math.max(0, Number(tariff.payout_delay_minutes ?? 0));
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}
