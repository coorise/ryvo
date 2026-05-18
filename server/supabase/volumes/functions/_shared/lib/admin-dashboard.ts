import { getAdminClient } from "./supabase.ts";

const ACTIVE_TRIP_STATUSES = [
  "driver_en_route",
  "driver_arrived",
  "rider_picked_up",
  "in_progress",
];

export async function getAdminDashboard() {
  const db = getAdminClient();
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    rides24h,
    tripsToday,
    cancelledToday,
    paymentsToday,
    ratings,
    activeTrips,
    pendingKyc,
    openTickets,
    stuckTrips,
    auditRecent,
    chartRows,
    pendingDrivers,
  ] = await Promise.all([
    db
      .from("trip_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    db
      .from("trip_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    db
      .from("trip_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso)
      .eq("status", "cancelled"),
    db
      .from("payment_intents")
      .select("amount")
      .gte("created_at", todayIso)
      .eq("status", "succeeded"),
    db
      .from("ratings_reviews")
      .select("stars")
      .gte("created_at", since7d),
    db
      .from("trips")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_TRIP_STATUSES),
    db
      .from("kyc_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("trips")
      .select("id, status, created_at, pickup_address")
      .in("status", ACTIVE_TRIP_STATUSES)
      .lt("created_at", new Date(now - 18 * 60 * 1000).toISOString())
      .limit(5),
    db
      .from("audit_logs")
      .select("id, action, actor_id, created_at, target_type")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("trip_requests")
      .select("created_at")
      .gte("created_at", since7d),
    db
      .from("kyc_documents")
      .select("driver_id, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(6),
  ]);

  const rides24hCount = rides24h.count ?? 0;
  const tripsTodayCount = tripsToday.count ?? 0;
  const cancelledCount = cancelledToday.count ?? 0;
  const cancelRate =
    tripsTodayCount > 0 ? Math.round((cancelledCount / tripsTodayCount) * 1000) / 10 : 0;

  const revenueToday = (paymentsToday.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const stars = ratings.data ?? [];
  const avgRating =
    stars.length > 0
      ? Math.round((stars.reduce((s, r) => s + Number(r.stars), 0) / stars.length) * 100) / 100
      : null;

  const chart = buildDailyChart(chartRows.data ?? []);

  const drivers = await enrichPendingDrivers(db, pendingDrivers.data ?? []);

  const alerts = buildAlerts({
    stuckTrips: stuckTrips.data ?? [],
    openTickets: openTickets.count ?? 0,
    pendingKyc: pendingKyc.count ?? 0,
  });

  return {
    stats: {
      rides_24h: rides24hCount,
      revenue_today: revenueToday,
      cancel_rate_pct: cancelRate,
      satisfaction_avg: avgRating,
    },
    badges: {
      rides: tripsTodayCount,
      drivers: pendingKyc.count ?? 0,
      tickets: openTickets.count ?? 0,
    },
    alerts,
    chart,
    pending_drivers: drivers,
    recent_audit: (auditRecent.data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      actor_id: row.actor_id,
      target_type: row.target_type,
      created_at: row.created_at,
    })),
    live: {
      active_trips: activeTrips.count ?? 0,
    },
  };
}

function buildDailyChart(rows: { created_at: string }[]) {
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { weekday: "narrow" });
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = rows.filter((r) => {
      const t = r.created_at.slice(0, 10);
      return t === key;
    }).length;
    days.push({ label, count });
  }
  return days;
}

async function enrichPendingDrivers(
  db: ReturnType<typeof getAdminClient>,
  docs: { driver_id: string; created_at: string }[],
) {
  const unique = [...new Set(docs.map((d) => d.driver_id))].slice(0, 6);
  const result: { id: string; name: string; city: string; status: string }[] = [];
  for (const driverId of unique) {
    const { data: authUser } = await db.auth.admin.getUserById(driverId);
    const name =
      (authUser.user?.user_metadata?.full_name as string) ??
      authUser.user?.email?.split("@")[0] ??
      "Driver";
    result.push({
      id: driverId.slice(0, 8).toUpperCase(),
      name: String(name),
      city: "—",
      status: "pending",
    });
  }
  return result;
}

function buildAlerts(input: {
  stuckTrips: { id: string; pickup_address: string | null }[];
  openTickets: number;
  pendingKyc: number;
}) {
  const alerts: {
    id: string;
    severity: "critical" | "warning" | "info";
    text: string;
    href: string;
  }[] = [];

  for (const t of input.stuckTrips.slice(0, 1)) {
    alerts.push({
      id: `stuck-${t.id}`,
      severity: "critical",
      text: `Trip ${t.id.slice(0, 8)} stalled · ${t.pickup_address ?? "unknown"}`,
      href: "/admin/rides",
    });
  }
  if (input.openTickets > 0) {
    alerts.push({
      id: "tickets-open",
      severity: "warning",
      text: `${input.openTickets} open support ticket${input.openTickets > 1 ? "s" : ""}`,
      href: "/admin/tickets",
    });
  }
  if (input.pendingKyc > 0) {
    alerts.push({
      id: "kyc-pending",
      severity: "info",
      text: `${input.pendingKyc} driver(s) awaiting KYC validation`,
      href: "/admin/drivers",
    });
  }
  return alerts;
}
