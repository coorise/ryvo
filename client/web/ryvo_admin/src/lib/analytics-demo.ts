export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";

export type AnalyticsAudience = "all" | "clients" | "drivers";

export type ChartKind = "line" | "bar" | "pie" | "area" | "table";

export type KpiSnapshot = {
  activeUsers: number;
  completedTrips: number;
  avgRating: number;
  cancelRate: number;
  avgWaitMin: number;
  driverOnlineHours: number;
};

export function buildKpis(period: AnalyticsPeriod, audience: AnalyticsAudience): KpiSnapshot {
  const mult = period === "7d" ? 0.25 : period === "30d" ? 1 : period === "90d" ? 2.8 : 12;
  const aud =
    audience === "clients" ? 0.65 : audience === "drivers" ? 0.35 : 1;
  return {
    activeUsers: Math.round(8420 * mult * aud * 0.4),
    completedTrips: Math.round(12400 * mult * aud),
    avgRating: 4.72 - (audience === "drivers" ? 0.05 : 0),
    cancelRate: 3.2 + (period === "7d" ? 0.4 : 0),
    avgWaitMin: 4.8,
    driverOnlineHours: Math.round(18600 * mult * (audience === "clients" ? 0.5 : 1)),
  };
}

export function tripVolumeSeries(period: AnalyticsPeriod) {
  const n = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 12 : 12;
  return Array.from({ length: n }, (_, i) => ({
    label: period === "7d" ? `D${i + 1}` : `P${i + 1}`,
    trips: Math.round(180 + i * 12 + Math.sin(i) * 25),
    revenue: Math.round(4200 + i * 280 + Math.cos(i) * 400),
  }));
}

export function ratingDistribution() {
  return [
    { stars: "5★", count: 6200 },
    { stars: "4★", count: 2100 },
    { stars: "3★", count: 480 },
    { stars: "2★", count: 120 },
    { stars: "1★", count: 45 },
  ];
}

export function topDestinations() {
  return [
    { city: "Montréal — Downtown", trips: 2840, share: 22 },
    { city: "Laval", trips: 1920, share: 15 },
    { city: "Longueuil", trips: 1540, share: 12 },
    { city: "YUL Airport", trips: 1310, share: 10 },
    { city: "Québec City", trips: 980, share: 8 },
  ];
}

export function experienceScores() {
  return [
    { metric: "App UX (clients)", score: 4.6 },
    { metric: "Driver app UX", score: 4.4 },
    { metric: "Support CSAT", score: 4.2 },
    { metric: "On-time pickup", score: 4.5 },
  ];
}

export const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
