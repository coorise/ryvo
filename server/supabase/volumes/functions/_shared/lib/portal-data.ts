import { getAdminClient } from "./supabase.ts";

export type PortalTripListRow = {
  id: string;
  status: string;
  created_at: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  client_id: string;
  driver_id: string | null;
  fare_estimate: number | null;
  kind: "trip" | "request";
};

export type PortalPaymentListRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_intent_id: string | null;
  created_at: string;
  settled_at: string | null;
  trip_id: string | null;
  request_id: string | null;
  rider_id: string;
  rider_email: string;
};

function mapTripRow(row: Record<string, unknown>): PortalTripListRow {
  const reqRaw = row.trip_requests;
  const req = Array.isArray(reqRaw) ? reqRaw[0] : reqRaw;
  const reqObj = (req ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    status: String(row.status),
    created_at: String(row.created_at),
    pickup_address: reqObj.pickup_address != null ? String(reqObj.pickup_address) : null,
    dropoff_address: reqObj.dropoff_address != null ? String(reqObj.dropoff_address) : null,
    client_id: String(row.rider_id),
    driver_id: row.driver_id != null ? String(row.driver_id) : null,
    fare_estimate: reqObj.estimated_fare != null ? Number(reqObj.estimated_fare) : null,
    kind: "trip",
  };
}

function mapRequestRow(row: Record<string, unknown>): PortalTripListRow {
  const assignments = (row.trip_assignments ?? []) as Array<Record<string, unknown>>;
  const accepted = assignments.find((a) => a.status === "accepted");
  const offered = assignments.find((a) => a.status === "offered");
  const driver = accepted ?? offered;
  return {
    id: String(row.id),
    status: String(row.status),
    created_at: String(row.created_at),
    pickup_address: row.pickup_address != null ? String(row.pickup_address) : null,
    dropoff_address: row.dropoff_address != null ? String(row.dropoff_address) : null,
    client_id: String(row.rider_id),
    driver_id: driver?.driver_id != null ? String(driver.driver_id) : null,
    fare_estimate: row.estimated_fare != null ? Number(row.estimated_fare) : null,
    kind: "request",
  };
}

export async function listMyTripsForUser(
  userId: string,
  roles: string[],
  limit = 100,
): Promise<PortalTripListRow[]> {
  const db = getAdminClient();
  const lim = Math.min(Math.max(limit, 1), 200);
  const isDriver = roles.includes("driver");
  const rows: PortalTripListRow[] = [];
  const seen = new Set<string>();

  const tripSelect =
    "id,status,created_at,rider_id,driver_id,request_id,trip_requests(pickup_address,dropoff_address,estimated_fare)";

  if (isDriver) {
    const { data: trips, error } = await db
      .from("trips")
      .select(tripSelect)
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(lim);
    if (error) throw new Error(error.message);
    for (const t of trips ?? []) {
      const mapped = mapTripRow(t as Record<string, unknown>);
      rows.push(mapped);
      seen.add(mapped.id);
    }
    return rows;
  }

  const { data: trips, error: tripErr } = await db
    .from("trips")
    .select(tripSelect)
    .eq("rider_id", userId)
    .order("created_at", { ascending: false })
    .limit(lim);
  if (tripErr) throw new Error(tripErr.message);
  for (const t of trips ?? []) {
    const mapped = mapTripRow(t as Record<string, unknown>);
    rows.push(mapped);
    const reqId = (t as Record<string, unknown>).request_id;
    if (reqId) seen.add(String(reqId));
  }

  const { data: requests, error: reqErr } = await db
    .from("trip_requests")
    .select(
      "id,status,created_at,rider_id,pickup_address,dropoff_address,estimated_fare,trip_assignments(driver_id,status)",
    )
    .eq("rider_id", userId)
    .order("created_at", { ascending: false })
    .limit(lim);
  if (reqErr) throw new Error(reqErr.message);
  for (const r of requests ?? []) {
    const id = String((r as Record<string, unknown>).id);
    if (seen.has(id)) continue;
    rows.push(mapRequestRow(r as Record<string, unknown>));
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return rows.slice(0, lim);
}

export async function listMyPaymentsForUser(
  userId: string,
  roles: string[],
  opts?: { status?: string; limit?: number },
): Promise<PortalPaymentListRow[]> {
  const db = getAdminClient();
  const lim = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const isDriver = roles.includes("driver");

  if (isDriver) {
    let q = db
      .from("payouts")
      .select("id,net_amount,status,created_at,paid_at,driver_id")
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(lim);
    if (opts?.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      amount: Number(r.net_amount),
      currency: "USD",
      status: String(r.status),
      provider: "payout",
      provider_intent_id: null,
      created_at: String(r.created_at),
      settled_at: r.paid_at != null ? String(r.paid_at) : null,
      trip_id: null,
      request_id: null,
      rider_id: userId,
      rider_email: userId.slice(0, 8),
    }));
  }

  let q = db
    .from("payment_intents")
    .select(
      "id,amount,currency,status,provider,provider_intent_id,created_at,settled_at,trip_id,request_id,rider_id",
    )
    .eq("rider_id", userId)
    .order("created_at", { ascending: false })
    .limit(lim);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    amount: Number(r.amount),
    currency: String(r.currency),
    status: String(r.status),
    provider: String(r.provider),
    provider_intent_id: r.provider_intent_id != null ? String(r.provider_intent_id) : null,
    created_at: String(r.created_at),
    settled_at: r.settled_at != null ? String(r.settled_at) : null,
    trip_id: r.trip_id != null ? String(r.trip_id) : null,
    request_id: r.request_id != null ? String(r.request_id) : null,
    rider_id: String(r.rider_id),
    rider_email: String(r.rider_id).slice(0, 8),
  }));
}

export async function listMyActivityLogs(userId: string, limit = 200) {
  const db = getAdminClient();
  const lim = Math.min(Math.max(limit, 1), 500);
  const { data, error } = await db
    .from("audit_logs")
    .select("*")
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(lim);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMySecurityAuthEvents(
  userId: string,
  opts?: { severity?: string; limit?: number },
) {
  const db = getAdminClient();
  const lim = Math.min(Math.max(opts?.limit ?? 300, 1), 500);
  let q = db
    .from("security_auth_events")
    .select("*")
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(lim);
  if (opts?.severity && opts.severity !== "all") {
    q = q.eq("severity", opts.severity);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMyDevices(userId: string, includeRevoked = true) {
  const db = getAdminClient();
  let q = db
    .from("device_tokens")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (!includeRevoked) q = q.is("revoked_at", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    user_email: userId,
    token_preview: String(row.token ?? "").slice(-8),
  }));
}
