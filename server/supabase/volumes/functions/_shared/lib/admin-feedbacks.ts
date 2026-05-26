import { getAdminClient } from "./supabase.ts";

export type FeedbackCategory = "product" | "driver" | "staff";
export type FeedbackGranularity = "day" | "week" | "month" | "year";

export type ServiceFeedbackRow = {
  id: string;
  category: FeedbackCategory;
  source: string;
  author_id: string | null;
  author_role: string | null;
  subject_user_id: string | null;
  subject_label: string | null;
  trip_id: string | null;
  stars: number;
  comment: string | null;
  tags: string[];
  is_litige: boolean;
  created_at: string;
};

export type FeedbackInsightItem = {
  label: string;
  count: number;
  score?: number;
};

export type FeedbackSeriesPoint = {
  key: string;
  label: string;
  score: number | null;
  count: number;
  bucketStart: string;
  bucketEnd: string;
  insights: {
    type: "themes" | "drivers" | "staff";
    items: FeedbackInsightItem[];
  };
};

function starScore(stars: number): number {
  return Math.round((stars / 5) * 100);
}

function startOfBucket(d: Date, g: FeedbackGranularity): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (g === "week") {
    const day = x.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    x.setUTCDate(x.getUTCDate() - diff);
  } else if (g === "month") {
    x.setUTCDate(1);
  } else if (g === "year") {
    x.setUTCMonth(0, 1);
  }
  return x;
}

function addBucket(d: Date, g: FeedbackGranularity): Date {
  const x = new Date(d);
  if (g === "day") x.setUTCDate(x.getUTCDate() + 1);
  else if (g === "week") x.setUTCDate(x.getUTCDate() + 7);
  else if (g === "month") x.setUTCMonth(x.getUTCMonth() + 1);
  else x.setUTCFullYear(x.getUTCFullYear() + 1);
  return x;
}

function rangeForGranularity(g: FeedbackGranularity): { from: Date; bucketCount: number } {
  const now = new Date();
  if (g === "day") {
    return { from: new Date(now.getTime() - 13 * 86400000), bucketCount: 14 };
  }
  if (g === "week") {
    return { from: new Date(now.getTime() - 11 * 7 * 86400000), bucketCount: 12 };
  }
  if (g === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    return { from, bucketCount: 12 };
  }
  const from = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
  return { from, bucketCount: 5 };
}

function labelForBucket(d: Date, g: FeedbackGranularity): string {
  if (g === "day") {
    return d.toISOString().slice(5, 10);
  }
  if (g === "week") {
    const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7,
    );
    return `W${week}`;
  }
  if (g === "month") {
    return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  }
  return String(d.getUTCFullYear());
}

function buildInsights(category: FeedbackCategory, rows: ServiceFeedbackRow[]) {
  if (category === "product") {
    const tagCounts = new Map<string, number>();
    for (const r of rows) {
      for (const t of r.tags ?? []) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    const items: FeedbackInsightItem[] = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));
    return { type: "themes" as const, items };
  }

  const bySubject = new Map<string, { label: string; total: number; n: number }>();
  for (const r of rows) {
    const key = r.subject_user_id ?? r.subject_label ?? "unknown";
    const label = r.subject_label ?? (r.subject_user_id ? `${r.subject_user_id.slice(0, 8)}…` : "Unknown");
    const cur = bySubject.get(key) ?? { label, total: 0, n: 0 };
    cur.total += r.stars;
    cur.n += 1;
    bySubject.set(key, cur);
  }

  const items: FeedbackInsightItem[] = [...bySubject.values()]
    .map((v) => ({
      label: v.label,
      count: v.n,
      score: starScore(v.total / v.n),
    }))
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 6);

  return {
    type: category === "driver" ? ("drivers" as const) : ("staff" as const),
    items,
  };
}

export async function getFeedbackAnalytics(
  category: FeedbackCategory,
  granularity: FeedbackGranularity,
) {
  const db = getAdminClient();
  const { from, bucketCount } = rangeForGranularity(granularity);
  const now = new Date();

  const { data, error } = await db
    .from("service_feedback")
    .select("*")
    .eq("category", category)
    .gte("created_at", from.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: true })
    .limit(3000);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ServiceFeedbackRow[];
  const series: FeedbackSeriesPoint[] = [];
  let cursor = startOfBucket(from, granularity);

  for (let i = 0; i < bucketCount; i++) {
    const end = addBucket(cursor, granularity);
    const inBucket = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= cursor.getTime() && t < end.getTime();
    });
    const score = inBucket.length
      ? Math.round(inBucket.reduce((s, r) => s + starScore(r.stars), 0) / inBucket.length)
      : null;

    series.push({
      key: cursor.toISOString(),
      label: labelForBucket(cursor, granularity),
      score,
      count: inBucket.length,
      bucketStart: cursor.toISOString(),
      bucketEnd: end.toISOString(),
      insights: buildInsights(category, inBucket),
    });
    cursor = end;
  }

  const scores = rows.map((r) => starScore(r.stars));
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    category,
    granularity,
    series,
    entries: [...rows].reverse(),
    stats: {
      total: rows.length,
      avgScore,
      litiges: rows.filter((r) => r.is_litige).length,
      lowRatings: rows.filter((r) => r.stars <= 2).length,
    },
  };
}

export function parseFeedbackCategory(raw: string | null): FeedbackCategory | null {
  if (raw === "product" || raw === "driver" || raw === "staff") return raw;
  return null;
}

export function parseFeedbackGranularity(raw: string | null): FeedbackGranularity {
  if (raw === "day" || raw === "week" || raw === "month" || raw === "year") return raw;
  return "week";
}
