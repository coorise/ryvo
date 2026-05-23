import { getAdminClient } from "./supabase.ts";
import { getUserEmails } from "./finance-referrals.ts";
import { notifyDriverFinance } from "./finance-paycheck-notify.ts";
import { computeTransferDueAtFromTariff } from "./finance-tariff-utils.ts";

export type PaycheckStatus = "pending" | "paid" | "held" | "cancelled";

export function computeTransferDueAt(
  payoutCadence: string,
  delayMinutes: number,
  from = new Date(),
): string {
  const tariff =
    payoutCadence === "days"
      ? { payout_label: "days", payout_delay_days: delayMinutes }
      : { payout_label: "instant", payout_delay_minutes: delayMinutes };
  return computeTransferDueAtFromTariff(tariff, from);
}

export function periodRemainingLabel(transferDueAt: string | null): string {
  if (!transferDueAt) return "—";
  const ms = new Date(transferDueAt).getTime() - Date.now();
  if (ms <= 0) return "Due now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

async function getTariffMap(ids: string[]) {
  const db = getAdminClient();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, Record<string, unknown>>();
  const { data } = await db.from("driver_tariff_packages").select("*").in("id", unique);
  return new Map((data ?? []).map((t) => [String(t.id), t]));
}

/** Active subscription tariff per driver (for paychecks missing tariff_package_id). */
async function getActiveTariffByDriver(driverIds: string[]) {
  const db = getAdminClient();
  const unique = [...new Set(driverIds.filter(Boolean))];
  if (!unique.length) return new Map<string, Record<string, unknown>>();

  const { data, error } = await db
    .from("driver_tariff_subscriptions")
    .select("driver_id, tariff_package_id, updated_at, driver_tariff_packages(*)")
    .in("driver_id", unique)
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const map = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const driverId = String(row.driver_id);
    if (map.has(driverId)) continue;
    const pkg = row.driver_tariff_packages as Record<string, unknown> | null;
    if (pkg && typeof pkg === "object") map.set(driverId, pkg);
  }
  return map;
}

function resolvePaycheckTariff(
  row: Record<string, unknown>,
  tariffById: Map<string, Record<string, unknown>>,
  tariffByDriver: Map<string, Record<string, unknown>>,
): Record<string, unknown> | null {
  const pkgId = row.tariff_package_id != null ? String(row.tariff_package_id) : "";
  if (pkgId && tariffById.has(pkgId)) return tariffById.get(pkgId)!;
  return tariffByDriver.get(String(row.driver_id)) ?? null;
}

export async function listPaychecksEnriched(status?: string) {
  const db = getAdminClient();
  let q = db.from("driver_paychecks").select("*").order("created_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => String(r.driver_id)));

  const tariffIds = rows.map((r) => String(r.tariff_package_id ?? "")).filter(Boolean);
  const driversMissingTariff = rows
    .filter((r) => !r.tariff_package_id)
    .map((r) => String(r.driver_id));

  const [tariffById, tariffByDriver] = await Promise.all([
    getTariffMap(tariffIds),
    getActiveTariffByDriver(driversMissingTariff),
  ]);

  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    const tariff = resolvePaycheckTariff(row, tariffById, tariffByDriver);
    const triggeredAt = new Date(String(r.created_at));
    const transferDue =
      r.transfer_due_at != null
        ? String(r.transfer_due_at)
        : tariff
          ? computeTransferDueAtFromTariff(tariff, triggeredAt)
          : null;
    return {
      id: String(r.id),
      driver_id: String(r.driver_id),
      driver_email: emails.get(String(r.driver_id)) ?? String(r.driver_id).slice(0, 8),
      amount: Number(r.amount),
      currency: String(r.currency),
      status: r.status as PaycheckStatus,
      period_label: r.period_label != null ? String(r.period_label) : null,
      period_remaining: periodRemainingLabel(transferDue),
      auto_pay: Boolean(r.auto_pay),
      paid_at: r.paid_at != null ? String(r.paid_at) : null,
      note: r.note != null ? String(r.note) : null,
      hold_reason: r.hold_reason != null ? String(r.hold_reason) : null,
      cancel_reason: r.cancel_reason != null ? String(r.cancel_reason) : null,
      created_at: String(r.created_at),
      tariff_package_id:
        r.tariff_package_id != null
          ? String(r.tariff_package_id)
          : tariff?.id != null
            ? String(tariff.id)
            : null,
      tariff_name: tariff ? String(tariff.name) : null,
      transfer_due_at: transferDue,
      is_subscription: Boolean(r.is_subscription),
      source: String(r.source ?? "manual"),
      in_payout_queue: Boolean(r.in_payout_queue ?? true),
    };
  });
}

export async function createPaycheckAdmin(input: {
  driver_id: string;
  amount: number;
  period_label?: string;
  note?: string;
  tariff_package_id?: string;
}) {
  const db = getAdminClient();
  let tariff: Record<string, unknown> | null = null;
  let tariffPackageId = input.tariff_package_id ?? null;

  if (tariffPackageId) {
    const { data } = await db
      .from("driver_tariff_packages")
      .select("*")
      .eq("id", tariffPackageId)
      .maybeSingle();
    tariff = data;
  } else {
    const { data: sub } = await db
      .from("driver_tariff_subscriptions")
      .select("tariff_package_id, driver_tariff_packages(*)")
      .eq("driver_id", input.driver_id)
      .eq("status", "active")
      .maybeSingle();
    tariff = (sub?.driver_tariff_packages ?? null) as Record<string, unknown> | null;
    tariffPackageId = sub?.tariff_package_id != null ? String(sub.tariff_package_id) : null;
  }

  const isBasic = Boolean(tariff?.is_basic) || String(tariff?.code ?? "") === "basic";
  const triggeredAt = new Date();
  const transfer_due_at = tariff ? computeTransferDueAtFromTariff(tariff, triggeredAt) : null;

  const { data, error } = await db
    .from("driver_paychecks")
    .insert({
      driver_id: input.driver_id,
      amount: input.amount,
      period_label: input.period_label ?? "Manual",
      note: input.note,
      status: "pending",
      auto_pay: !isBasic,
      tariff_package_id: tariffPackageId,
      transfer_due_at,
      is_subscription: !isBasic,
      source: "admin",
      in_payout_queue: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePaycheckAmount(id: string, amount: number) {
  const db = getAdminClient();
  const { data: row } = await db.from("driver_paychecks").select("status").eq("id", id).single();
  if (!row || !["pending", "held"].includes(String(row.status))) {
    throw new Error("Can only edit amount for pending or held paychecks");
  }
  const { data, error } = await db
    .from("driver_paychecks")
    .update({ amount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePaycheckStatus(
  id: string,
  status: PaycheckStatus,
  paidBy?: string,
  extra?: { hold_reason?: string; cancel_reason?: string; in_payout_queue?: boolean },
) {
  const db = getAdminClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "paid") {
    patch.paid_at = new Date().toISOString();
    patch.paid_by = paidBy;
    patch.in_payout_queue = false;
  }
  if (status === "held") {
    patch.hold_reason = extra?.hold_reason ?? null;
    patch.in_payout_queue = false;
  }
  if (status === "pending") {
    patch.hold_reason = null;
    patch.in_payout_queue = extra?.in_payout_queue ?? true;
  }
  if (status === "cancelled") {
    patch.cancel_reason = extra?.cancel_reason ?? null;
    patch.in_payout_queue = false;
  }
  const { data, error } = await db.from("driver_paychecks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function holdPaycheck(
  id: string,
  opts: { reason?: string; notify?: boolean },
) {
  const db = getAdminClient();
  const { data: row } = await db.from("driver_paychecks").select("driver_id,status").eq("id", id).single();
  if (!row || String(row.status) !== "pending") throw new Error("Only pending paychecks can be held");
  const updated = await updatePaycheckStatus(id, "held", undefined, { hold_reason: opts.reason });
  await notifyDriverFinance(String(row.driver_id), "paycheck.held", {
    reason: opts.reason,
    notify: opts.notify,
  });
  return updated;
}

export async function resumePaycheck(id: string, opts: { notify?: boolean }) {
  const db = getAdminClient();
  const { data: row } = await db.from("driver_paychecks").select("driver_id,status").eq("id", id).single();
  if (!row || String(row.status) !== "held") throw new Error("Only held paychecks can be resumed");
  const updated = await updatePaycheckStatus(id, "pending", undefined, { in_payout_queue: true });
  await notifyDriverFinance(String(row.driver_id), "paycheck.resumed", { notify: opts.notify });
  return updated;
}

export async function cancelPaycheck(
  id: string,
  opts: { reason?: string; notify?: boolean },
) {
  const db = getAdminClient();
  const { data: row } = await db.from("driver_paychecks").select("driver_id,status").eq("id", id).single();
  if (!row || !["pending", "held"].includes(String(row.status))) {
    throw new Error("Only pending or held paychecks can be cancelled");
  }
  const updated = await updatePaycheckStatus(id, "cancelled", undefined, { cancel_reason: opts.reason });
  await notifyDriverFinance(String(row.driver_id), "paycheck.cancelled", {
    reason: opts.reason,
    notify: opts.notify,
  });
  return updated;
}

export async function deletePaycheck(id: string) {
  const db = getAdminClient();
  const { data: row } = await db.from("driver_paychecks").select("status").eq("id", id).single();
  if (!row) throw new Error("Paycheck not found");
  const status = String(row.status);
  if (status === "held") {
    throw new Error("Cancel this paycheck before deleting it");
  }
  const { error } = await db.from("driver_paychecks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { deleted: true, status };
}

export async function enqueueSubscriptionPaycheck(
  driverId: string,
  tariffPackageId: string,
  amount: number,
  periodLabel: string,
) {
  const db = getAdminClient();
  const { data: tariff } = await db
    .from("driver_tariff_packages")
    .select("*")
    .eq("id", tariffPackageId)
    .single();
  if (!tariff) throw new Error("Tariff package not found");
  const transfer_due_at = computeTransferDueAtFromTariff(tariff, new Date());
  const { data, error } = await db
    .from("driver_paychecks")
    .insert({
      driver_id: driverId,
      amount,
      period_label: periodLabel,
      status: "pending",
      auto_pay: true,
      tariff_package_id: tariffPackageId,
      transfer_due_at,
      is_subscription: true,
      source: "subscription",
      in_payout_queue: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
