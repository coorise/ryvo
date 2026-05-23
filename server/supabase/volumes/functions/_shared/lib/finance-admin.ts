import { getAdminClient } from "./supabase.ts";

export async function getReferralSettings() {
  const db = getAdminClient();
  const { data } = await db.from("referral_settings").select("*").eq("id", "default").single();
  return data ?? { client_config: {}, driver_config: {} };
}

export async function updateReferralSettings(client: object, driver: object) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("referral_settings")
    .upsert({ id: "default", client_config: client, driver_config: driver, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listReferrals() {
  const db = getAdminClient();
  const { data } = await db.from("referral_entries").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function listLoyalty() {
  const db = getAdminClient();
  const { data } = await db.from("loyalty_points").select("*").order("points", { ascending: false }).limit(200);
  return data ?? [];
}

export async function listTariffs() {
  const db = getAdminClient();
  const { data } = await db
    .from("driver_tariff_packages")
    .select("*")
    .order("search_boost", { ascending: false });
  return data ?? [];
}

export async function upsertTariff(row: Record<string, unknown>) {
  const db = getAdminClient();
  const payload = { ...row, updated_at: new Date().toISOString() };
  const { data, error } = await db.from("driver_tariff_packages").upsert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createTariff(row: Record<string, unknown>) {
  const db = getAdminClient();
  const { id: _id, ...rest } = row;
  const { data, error } = await db
    .from("driver_tariff_packages")
    .insert({ ...rest, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTariff(id: string) {
  const db = getAdminClient();
  const { data: existing } = await db
    .from("driver_tariff_packages")
    .select("is_system,is_basic,code")
    .eq("id", id)
    .maybeSingle();
  if (existing?.is_system) throw new Error("Cannot delete system package");
  if (existing?.is_basic || existing?.code === "basic") {
    throw new Error("Basic package cannot be deleted");
  }
  const { error } = await db.from("driver_tariff_packages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export {
  listPaychecksEnriched as listPaychecks,
  createPaycheckAdmin as createPaycheck,
  updatePaycheckStatus,
  updatePaycheckAmount,
  holdPaycheck,
  resumePaycheck,
  cancelPaycheck,
  deletePaycheck,
} from "./finance-paychecks.ts";

export async function listCheckouts(status?: string) {
  const db = getAdminClient();
  let q = db.from("checkout_sessions").select("*").order("last_event_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return data ?? [];
}

export async function seedDemoFinanceIfEmpty() {
  const db = getAdminClient();
  const { count } = await db.from("checkout_sessions").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const { data: clients } = await db.auth.admin.listUsers({ perPage: 5 });
  const users = clients?.users ?? [];
  const client = users.find((u) => u.email?.includes("client")) ?? users[0];
  const driver = users.find((u) => u.email?.includes("driver")) ?? users[1];
  if (!client) return;

  await db.from("checkout_sessions").insert([
    {
      client_id: client.id,
      driver_id: driver?.id,
      status: "abandoned",
      pickup_address: "1000 Rue de la Gauchetière, Montréal",
      dropoff_address: "YUL Airport",
      fare_estimate: 42.5,
      planned_at: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      client_id: client.id,
      status: "cancelled",
      pickup_address: "Old Port",
      dropoff_address: "Laval",
      fare_estimate: 28,
    },
    {
      client_id: client.id,
      driver_id: driver?.id,
      status: "completed",
      pickup_address: "Downtown",
      dropoff_address: "Plateau",
      fare_estimate: 18.75,
    },
  ]);

  if (client && driver) {
    await db.from("referral_entries").insert({
      referrer_id: client.id,
      referee_id: driver.id,
      role: "driver",
      channel: "link",
      bonus_earned: 15,
      status: "credited",
    });
    await db.from("driver_paychecks").insert({
      driver_id: driver.id,
      amount: 312.4,
      status: "pending",
      period_label: "Week 20",
      auto_pay: true,
    });
  }
}
