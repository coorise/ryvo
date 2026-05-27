export type BandwidthMode = "unlimited" | "metered";

export type OpexResource = {
  id: string;
  provider: string;
  cpus: number;
  ramGb: number;
  storageGb: number;
  bandwidthMode: BandwidthMode;
  bandwidthGb?: number;
  pricePerHour: number;
  marginDown: number;
  marginUp: number;
};

export type PeriodFilter = "weekly" | "monthly" | "yearly";

export type TrendPoint = {
  label: string;
  opex: number;
  revenue: number;
  profit: number;
  clientsPaid: number;
  driversEarned: number;
  platformFee: number;
};

const STORAGE_KEY = "ryvo.finance.opex.v1";

export const DEFAULT_OPEX_RESOURCES: OpexResource[] = [
  {
    id: "supabase-prod",
    provider: "Supabase (Postgres + Auth)",
    cpus: 4,
    ramGb: 16,
    storageGb: 100,
    bandwidthMode: "metered",
    bandwidthGb: 500,
    pricePerHour: 0.42,
    marginDown: -0.15,
    marginUp: 0.2,
  },
  {
    id: "functions-bun",
    provider: "Ryvo Functions (Bun gateway)",
    cpus: 2,
    ramGb: 4,
    storageGb: 20,
    bandwidthMode: "metered",
    bandwidthGb: 200,
    pricePerHour: 0.18,
    marginDown: -0.1,
    marginUp: 0.15,
  },
  {
    id: "kafka-redis",
    provider: "Kafka + Redis",
    cpus: 2,
    ramGb: 8,
    storageGb: 50,
    bandwidthMode: "unlimited",
    pricePerHour: 0.12,
    marginDown: -0.08,
    marginUp: 0.12,
  },
];

export function loadOpexResources(): OpexResource[] {
  if (typeof window === "undefined") return DEFAULT_OPEX_RESOURCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPEX_RESOURCES;
    const parsed = JSON.parse(raw) as OpexResource[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPEX_RESOURCES;
  } catch {
    return DEFAULT_OPEX_RESOURCES;
  }
}

export function saveOpexResources(resources: OpexResource[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
}

export function opexHourlyBand(resource: OpexResource) {
  const mid = resource.pricePerHour;
  return {
    low: Math.max(0, mid * (1 + resource.marginDown)),
    mid,
    high: mid * (1 + resource.marginUp),
  };
}

export function totalOpexHourly(resources: OpexResource[]) {
  return resources.reduce(
    (acc, r) => {
      const b = opexHourlyBand(r);
      return { low: acc.low + b.low, mid: acc.mid + b.mid, high: acc.high + b.high };
    },
    { low: 0, mid: 0, high: 0 },
  );
}

export function monthlyOpex(resources: OpexResource[], hours = 730) {
  const h = totalOpexHourly(resources);
  return { low: h.low * hours, mid: h.mid * hours, high: h.high * hours };
}

function periodPoints(period: PeriodFilter): number {
  if (period === "weekly") return 12;
  if (period === "monthly") return 12;
  return 5;
}

function periodLabel(period: PeriodFilter, index: number, total: number): string {
  if (period === "weekly") return `W${index + 1}`;
  if (period === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() - (total - 1 - index));
    return d.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
  }
  return `${new Date().getFullYear() - (total - 1 - index)}`;
}

/** Synthetic trend scaled from dashboard revenue + configured OPEX (speculative). */
export function buildFinanceTrend(
  period: PeriodFilter,
  resources: OpexResource[],
  baseMonthlyRevenue: number,
  platformFeePercent: number,
): TrendPoint[] {
  const n = periodPoints(period);
  const opexBase = monthlyOpex(resources).mid;
  const scale = period === "weekly" ? opexBase / 4.33 : period === "yearly" ? opexBase * 12 : opexBase;
  const revScale =
    period === "weekly" ? baseMonthlyRevenue / 4.33 : period === "yearly" ? baseMonthlyRevenue * 12 : baseMonthlyRevenue;

  return Array.from({ length: n }, (_, i) => {
    const growth = 0.92 + i * 0.018 + Math.sin(i * 0.7) * 0.04;
    const opex = scale * (0.88 + i * 0.02) * (1 + Math.cos(i) * 0.03);
    const revenue = Math.max(0, revScale * growth);
    const platformFee = revenue * (platformFeePercent / 100);
    const driversEarned = (revenue - platformFee) * 0.78;
    const clientsPaid = revenue;
    const profit = revenue - opex;
    return {
      label: periodLabel(period, i, n),
      opex: Math.round(opex),
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      clientsPaid: Math.round(clientsPaid),
      driversEarned: Math.round(driversEarned),
      platformFee: Math.round(platformFee),
    };
  });
}

export function roiPercent(revenue: number, opex: number) {
  if (opex <= 0) return revenue > 0 ? 100 : 0;
  return Math.round(((revenue - opex) / opex) * 1000) / 10;
}
