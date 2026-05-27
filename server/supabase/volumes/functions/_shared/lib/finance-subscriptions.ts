import { getAdminClient } from "./supabase.ts";
import { getUserEmails } from "./finance-referrals.ts";
import { enqueueSubscriptionPaycheck } from "./finance-paychecks.ts";
import { getBasicTariffId } from "./finance-tariff-utils.ts";

export async function listTariffSubscriptions(status?: string) {
  const db = getAdminClient();
  let q = db
    .from("driver_tariff_subscriptions")
    .select("*, driver_tariff_packages(id, name, code, billing_mode, subscription_monthly, payout_label, is_basic)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => String(r.driver_id)));

  return rows.map((r) => {
    const pkg = r.driver_tariff_packages as Record<string, unknown> | null;
    return {
      id: String(r.id),
      driver_id: String(r.driver_id),
      driver_email: emails.get(String(r.driver_id)) ?? String(r.driver_id).slice(0, 8),
      tariff_package_id: String(r.tariff_package_id),
      tariff_name: pkg ? String(pkg.name) : "—",
      tariff_code: pkg ? String(pkg.code) : "",
      billing_mode: pkg ? String(pkg.billing_mode) : "",
      is_basic: Boolean(pkg?.is_basic),
      subscription_monthly: pkg?.subscription_monthly != null ? Number(pkg.subscription_monthly) : null,
      status: String(r.status),
      hold_reason: r.hold_reason != null ? String(r.hold_reason) : null,
      started_at: String(r.started_at),
      ends_at: r.ends_at != null ? String(r.ends_at) : null,
      next_paycheck_at: r.next_paycheck_at != null ? String(r.next_paycheck_at) : null,
      payout_cadence: pkg ? String(pkg.payout_label ?? "instant") : null,
    };
  });
}

export async function migrateTariffSubscription(input: {
  driver_id: string;
  tariff_package_id: string;
  notify?: boolean;
}) {
  const db = getAdminClient();
  const basicId = await getBasicTariffId();
  if (input.tariff_package_id === basicId) {
    await db
      .from("driver_tariff_subscriptions")
      .update({ status: "cancelled", ends_at: new Date().toISOString() })
      .eq("driver_id", input.driver_id)
      .neq("tariff_package_id", basicId)
      .eq("status", "active");
    return createTariffSubscription({ ...input, notify: input.notify });
  }

  await db
    .from("driver_tariff_subscriptions")
    .update({ status: "cancelled", ends_at: new Date().toISOString() })
    .eq("driver_id", input.driver_id)
    .eq("status", "active");

  return createTariffSubscription(input);
}

export async function createTariffSubscription(input: {
  driver_id: string;
  tariff_package_id: string;
  notify?: boolean;
}) {
  const db = getAdminClient();
  const { data: tariff } = await db
    .from("driver_tariff_packages")
    .select("*")
    .eq("id", input.tariff_package_id)
    .single();
  if (!tariff) throw new Error("Tariff not found");

  const isBasic = Boolean(tariff.is_basic) || String(tariff.code) === "basic";
  const { data, error } = await db
    .from("driver_tariff_subscriptions")
    .upsert(
      {
        driver_id: input.driver_id,
        tariff_package_id: input.tariff_package_id,
        status: "active",
        hold_reason: null,
        next_paycheck_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id,tariff_package_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);

  const amount = Number(tariff.subscription_monthly ?? 0);
  if (!isBasic && amount > 0) {
    await enqueueSubscriptionPaycheck(
      input.driver_id,
      input.tariff_package_id,
      amount,
      `Subscription — ${tariff.name}`,
    );
  }

  if (input.notify !== false) {
    const { notifyDriverFinance } = await import("./finance-paycheck-notify.ts");
    await notifyDriverFinance(input.driver_id, "subscription.created", { notify: true });
  }
  return data;
}

export async function holdTariffSubscription(
  id: string,
  opts: { reason?: string; notify?: boolean },
) {
  const db = getAdminClient();
  const { data: row } = await db
    .from("driver_tariff_subscriptions")
    .select("driver_id,status,driver_tariff_packages(is_basic)")
    .eq("id", id)
    .single();
  if (!row || String(row.status) !== "active") throw new Error("Only active subscriptions can be held");
  const pkg = row.driver_tariff_packages as { is_basic?: boolean } | null;
  if (pkg?.is_basic) throw new Error("Basic plan cannot be held");

  const { data, error } = await db
    .from("driver_tariff_subscriptions")
    .update({
      status: "held",
      hold_reason: opts.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { notifyDriverFinance } = await import("./finance-paycheck-notify.ts");
  await notifyDriverFinance(String(row.driver_id), "subscription.held", {
    reason: opts.reason,
    notify: opts.notify,
  });
  return data;
}

export async function resumeTariffSubscription(id: string, opts: { notify?: boolean }) {
  const db = getAdminClient();
  const { data: row } = await db
    .from("driver_tariff_subscriptions")
    .select("driver_id,status")
    .eq("id", id)
    .single();
  if (!row || String(row.status) !== "held") throw new Error("Only held subscriptions can be resumed");
  const { data, error } = await db
    .from("driver_tariff_subscriptions")
    .update({
      status: "active",
      hold_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { notifyDriverFinance } = await import("./finance-paycheck-notify.ts");
  await notifyDriverFinance(String(row.driver_id), "paycheck.resumed", { notify: opts.notify });
  return data;
}

export async function cancelTariffSubscription(
  id: string,
  opts: { reason?: string; notify?: boolean },
) {
  const db = getAdminClient();
  const { data: row } = await db
    .from("driver_tariff_subscriptions")
    .select("driver_id,status,driver_tariff_packages(is_basic,code)")
    .eq("id", id)
    .single();
  if (!row || String(row.status) === "cancelled") throw new Error("Subscription already cancelled");
  const pkg = row.driver_tariff_packages as { is_basic?: boolean; code?: string } | null;
  if (pkg?.is_basic || pkg?.code === "basic") {
    throw new Error("Basic plan cannot be cancelled — migrate to another package instead");
  }

  const { data, error } = await db
    .from("driver_tariff_subscriptions")
    .update({
      status: "cancelled",
      hold_reason: opts.reason ?? null,
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const basicId = await getBasicTariffId();
  await createTariffSubscription({
    driver_id: String(row.driver_id),
    tariff_package_id: basicId,
    notify: false,
  });

  const { notifyDriverFinance } = await import("./finance-paycheck-notify.ts");
  await notifyDriverFinance(String(row.driver_id), "subscription.cancelled", {
    reason: opts.reason,
    notify: opts.notify,
  });
  return data;
}

export async function deleteTariffSubscription(id: string) {
  const db = getAdminClient();
  const { data: row } = await db
    .from("driver_tariff_subscriptions")
    .select("status,driver_tariff_packages(is_basic)")
    .eq("id", id)
    .single();
  if (!row) throw new Error("Subscription not found");
  const pkg = row.driver_tariff_packages as { is_basic?: boolean } | null;
  if (pkg?.is_basic) throw new Error("Basic subscription cannot be deleted");
  if (String(row.status) === "held") throw new Error("Cancel the subscription before deleting it");
  const { error } = await db.from("driver_tariff_subscriptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { deleted: true };
}
