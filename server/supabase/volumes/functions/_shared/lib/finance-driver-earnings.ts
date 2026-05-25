import { getAdminClient } from "./supabase.ts";
import { getUserEmails } from "./finance-referrals.ts";
import { computeTransferDueAtFromTariff } from "./finance-tariff-utils.ts";

export type DriverEarningRow = {
  driver_id: string;
  driver_email: string;
  balance: number;
  tariff_name: string | null;
  tariff_code: string | null;
  updated_at: string;
};

export async function listDriverEarnings() {
  const db = getAdminClient();
  const { data: earnings, error } = await db
    .from("driver_earnings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = earnings ?? [];
  const emails = await getUserEmails(rows.map((r) => String(r.driver_id)));

  const { data: subs } = await db
    .from("driver_tariff_subscriptions")
    .select("driver_id, status, driver_tariff_packages(name,code)")
    .eq("status", "active");
  const subMap = new Map(
    (subs ?? []).map((s) => [
      String(s.driver_id),
      s.driver_tariff_packages as { name: string; code: string } | null,
    ]),
  );

  return rows.map((r) => {
    const pkg = subMap.get(String(r.driver_id));
    return {
      driver_id: String(r.driver_id),
      driver_email: emails.get(String(r.driver_id)) ?? String(r.driver_id).slice(0, 8),
      balance: Number(r.balance),
      tariff_name: pkg?.name ?? null,
      tariff_code: pkg?.code ?? null,
      updated_at: String(r.updated_at),
    };
  });
}

export async function upsertDriverEarning(driverId: string, balance: number) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("driver_earnings")
    .upsert(
      { driver_id: driverId, balance, updated_at: new Date().toISOString() },
      { onConflict: "driver_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adjustDriverEarning(driverId: string, delta: number, setBalance?: number) {
  const db = getAdminClient();
  const { data: current } = await db
    .from("driver_earnings")
    .select("balance")
    .eq("driver_id", driverId)
    .maybeSingle();
  const next =
    setBalance != null
      ? Math.max(0, setBalance)
      : Math.max(0, Number(current?.balance ?? 0) + delta);
  return upsertDriverEarning(driverId, next);
}

export async function queuePaycheckFromEarnings(driverId: string, amount: number) {
  const db = getAdminClient();
  const { data: earning } = await db
    .from("driver_earnings")
    .select("balance")
    .eq("driver_id", driverId)
    .single();
  if (!earning) throw new Error("Driver earnings record not found");
  if (amount <= 0 || amount > Number(earning.balance)) {
    throw new Error("Amount exceeds available balance");
  }

  const { data: sub } = await db
    .from("driver_tariff_subscriptions")
    .select("tariff_package_id, driver_tariff_packages(*)")
    .eq("driver_id", driverId)
    .eq("status", "active")
    .maybeSingle();
  const tariff = (sub?.driver_tariff_packages ?? null) as Record<string, unknown> | null;
  if (!tariff) throw new Error("Driver has no active tariff");

  const minWithdraw = Number(tariff.min_withdraw_amount ?? 0);
  if (amount < minWithdraw) {
    throw new Error(`Minimum withdrawal is $${minWithdraw}`);
  }
  const maxWithdraw =
    tariff.max_withdraw_amount != null ? Number(tariff.max_withdraw_amount) : null;
  if (maxWithdraw != null && amount > maxWithdraw) {
    throw new Error(`Maximum withdrawal is $${maxWithdraw}`);
  }

  const transfer_due_at = computeTransferDueAtFromTariff(tariff);
  const isBasic = Boolean(tariff.is_basic) || String(tariff.code) === "basic";

  const { data: paycheck, error: pcErr } = await db
    .from("driver_paychecks")
    .insert({
      driver_id: driverId,
      amount,
      period_label: "Withdrawal",
      status: "pending",
      auto_pay: false,
      tariff_package_id: sub?.tariff_package_id ?? null,
      transfer_due_at,
      is_subscription: !isBasic,
      source: "driver",
      in_payout_queue: true,
    })
    .select()
    .single();
  if (pcErr) throw new Error(pcErr.message);

  await db
    .from("driver_earnings")
    .update({
      balance: Number(earning.balance) - amount,
      updated_at: new Date().toISOString(),
    })
    .eq("driver_id", driverId);

  return paycheck;
}
