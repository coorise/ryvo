import { getAdminClient } from "./supabase.ts";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";
export type AnalyticsAudience = "all" | "clients" | "drivers";

function periodStart(period: AnalyticsPeriod): string {
  const now = Date.now();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  return new Date(now - days * 86400000).toISOString();
}

function bucketLabel(d: Date, period: AnalyticsPeriod): string {
  if (period === "1y") return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return d.toISOString().slice(5, 10);
}

export async function getAdminAnalytics(period: AnalyticsPeriod, audience: AnalyticsAudience) {
  const db = getAdminClient();
  const since = periodStart(period);

  const { data: roleRows } = await db.from("roles").select("id, name").in("name", ["client", "driver"]);
  const clientRoleId = roleRows?.find((r) => r.name === "client")?.id;
  const driverRoleId = roleRows?.find((r) => r.name === "driver")?.id;

  const [tripsRes, ratingsRes, feedbackRes, clientMembers, driverMembers] = await Promise.all([
    db.from("trips").select("id, status, created_at, rider_id, driver_id").gte("created_at", since),
    db.from("ratings_reviews").select("stars, role, created_at").gte("created_at", since),
    db.from("service_feedback").select("stars, category, created_at, author_role").gte("created_at", since),
    clientRoleId
      ? db.from("user_roles").select("user_id").eq("role_id", clientRoleId)
      : Promise.resolve({ data: [] }),
    driverRoleId
      ? db.from("user_roles").select("user_id").eq("role_id", driverRoleId)
      : Promise.resolve({ data: [] }),
  ]);

  const trips = tripsRes.data ?? [];
  const ratings = ratingsRes.data ?? [];
  const feedbacks = feedbackRes.data ?? [];

  const clientIds = new Set((clientMembers.data ?? []).map((r: { user_id: string }) => r.user_id));
  const driverIds = new Set((driverMembers.data ?? []).map((r: { user_id: string }) => r.user_id));

  const filterTrip = (row: { rider_id: string; driver_id: string }) => {
    if (audience === "all") return true;
    if (audience === "clients") return clientIds.has(row.rider_id);
    return driverIds.has(row.driver_id);
  };

  const filteredTrips = trips.filter(filterTrip);
  const completed = filteredTrips.filter((t) => t.status === "completed");
  const cancelled = filteredTrips.filter((t) => t.status === "cancelled");
  const cancelRate =
    filteredTrips.length > 0
      ? Math.round((cancelled.length / filteredTrips.length) * 1000) / 10
      : 0;

  const filteredRatings =
    audience === "all"
      ? ratings
      : ratings.filter((r) =>
          audience === "clients" ? r.role === "rider" : r.role === "driver",
        );

  const avgRating =
    filteredRatings.length > 0
      ? Math.round(
          (filteredRatings.reduce((s, r) => s + Number(r.stars), 0) / filteredRatings.length) * 100,
        ) / 100
      : 0;

  const activeUsers =
    audience === "clients"
      ? clientIds.size
      : audience === "drivers"
        ? driverIds.size
        : clientIds.size + driverIds.size;

  const volume = buildVolumeSeries(filteredTrips, period);
  const ratingDist = buildRatingDistribution(filteredRatings);
  const destinations = buildTopDestinations(filteredTrips);
  const experience = buildExperienceScores(feedbacks, filteredRatings);

  return {
    period,
    audience,
    kpis: {
      activeUsers,
      completedTrips: completed.length,
      avgRating,
      cancelRate,
      avgWaitMin: 4.5,
      driverOnlineHours: audience === "clients" ? 0 : Math.round(completed.length * 1.2),
    },
    volume,
    ratingDist,
    destinations,
    experience,
  };
}

function buildVolumeSeries(
  trips: { created_at: string }[],
  period: AnalyticsPeriod,
) {
  const bucketCount = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 12 : 12;
  const stepDays =
    period === "7d" ? 1 : period === "30d" ? 1 : period === "90d" ? 7 : 30;
  const out: { label: string; trips: number }[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  for (let i = bucketCount - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - i * stepDays);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + stepDays);
    const count = trips.filter((t) => {
      const ts = new Date(t.created_at).getTime();
      return ts >= start.getTime() && ts < end.getTime();
    }).length;
    out.push({ label: bucketLabel(start, period), trips: count });
  }
  return out;
}

function buildRatingDistribution(ratings: { stars: number }[]) {
  const counts = [0, 0, 0, 0, 0];
  for (const r of ratings) {
    const i = Math.min(5, Math.max(1, Number(r.stars))) - 1;
    counts[i] += 1;
  }
  return counts.map((count, i) => ({ stars: i + 1, count }));
}

function buildTopDestinations(_trips: { id: string }[]) {
  return [{ name: "—", count: _trips.length }];
}

function buildExperienceScores(
  feedbacks: { stars: number; category: string }[],
  ratings: { stars: number; role: string }[],
) {
  const avg = (rows: { stars: number }[]) =>
    rows.length
      ? Math.round((rows.reduce((s, r) => s + Number(r.stars), 0) / rows.length) * 20) / 20
      : 0;

  const product = feedbacks.filter((f) => f.category === "product");
  const driverFb = feedbacks.filter((f) => f.category === "driver");
  const staff = feedbacks.filter((f) => f.category === "staff");
  const riderRatings = ratings.filter((r) => r.role === "rider");

  return [
    { metric: "App UX (product feedback)", score: avg(product) },
    { metric: "Driver service (feedback)", score: avg(driverFb) },
    { metric: "Support / staff CSAT", score: avg(staff) },
    { metric: "Trip ratings (riders)", score: avg(riderRatings) },
  ];
}
