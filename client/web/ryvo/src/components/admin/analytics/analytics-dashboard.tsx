"use client";

import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPanel } from "@/components/admin/charts/chart-panel";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { CHART_COLORS, type ChartKind } from "@/lib/analytics-demo";
import { exportElementToPdf } from "@/lib/export-pdf";
import { cn } from "@/lib/utils";
import { QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { adminService } from "@/services/admin.service";

type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";
type AnalyticsAudience = "all" | "clients" | "drivers";

type AnalyticsDashboardProps = {
  /** Lock analytics to driver or client audience (portal dashboards). */
  lockedAudience?: Extract<AnalyticsAudience, "drivers" | "clients">;
};

export function AnalyticsDashboard(props: AnalyticsDashboardProps = {}) {
  const { lockedAudience } = props;
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [audienceState, setAudience] = useState<AnalyticsAudience>("all");
  const audience: AnalyticsAudience = lockedAudience ?? audienceState;
  const [volumeChart, setVolumeChart] = useState<ChartKind>("area");
  const [ratingChart, setRatingChart] = useState<ChartKind>("bar");
  const exportRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.admin.analytics(period, audience),
    queryFn: () => adminService.getAnalytics(accessToken, period, audience),
    enabled: Boolean(accessToken),
  });

  const kpis = data?.kpis ?? {
    activeUsers: 0,
    completedTrips: 0,
    avgRating: 0,
    cancelRate: 0,
    avgWaitMin: 0,
    driverOnlineHours: 0,
  };
  const volume = data?.volume ?? [];
  const ratings = data?.ratingDist ?? [];
  const experience = data?.experience ?? [];
  const destinations = useMemo(() => {
    const rows = data?.destinations ?? [];
    const total = rows.reduce((s, d) => s + d.count, 0) || 1;
    return rows.map((d) => ({
      city: d.name,
      trips: d.count,
      share: Math.round((d.count / total) * 100),
    }));
  }, [data?.destinations]);

  async function exportPdf() {
    if (!exportRef.current) return;
    await exportElementToPdf(
      exportRef.current,
      `ryvo-analytics-${period}-${Date.now()}`,
      t("analytics.title"),
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }
  if (isError) {
    return <p className="text-destructive text-sm">{t("analytics.loadError")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d", "1y"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold uppercase",
                period === p ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {t(`analytics.period.${p}`)}
            </button>
          ))}
          {!lockedAudience ? (
            <select
              className="border-border bg-background rounded-xl border px-3 py-1.5 text-xs font-semibold"
              value={audience}
              onChange={(e) => setAudience(e.target.value as AnalyticsAudience)}
            >
              <option value="all">{t("analytics.audience.all")}</option>
              <option value="clients">{t("analytics.audience.clients")}</option>
              <option value="drivers">{t("analytics.audience.drivers")}</option>
            </select>
          ) : null}
        </div>
        <RyvoButton intent="outline" onClick={() => void exportPdf()}>
          <FileDown className="size-4" /> {t("analytics.exportPdf")}
        </RyvoButton>
      </div>

      <div ref={exportRef} className="space-y-6 bg-background p-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={t("analytics.kpi.activeUsers")} value={kpis.activeUsers.toLocaleString()} />
          <KpiCard label={t("analytics.kpi.trips")} value={kpis.completedTrips.toLocaleString()} />
          <KpiCard label={t("analytics.kpi.rating")} value={kpis.avgRating.toFixed(2)} />
          <KpiCard label={t("analytics.kpi.cancelRate")} value={`${kpis.cancelRate}%`} />
          <KpiCard label={t("analytics.kpi.wait")} value={`${kpis.avgWaitMin} min`} />
          <KpiCard label={t("analytics.kpi.driverHours")} value={kpis.driverOnlineHours.toLocaleString()} />
        </div>

        <ChartPanel
          title={t("analytics.charts.volume")}
          actions={
            <select
              className="border-border rounded-lg border px-2 py-1 text-xs"
              value={volumeChart}
              onChange={(e) => setVolumeChart(e.target.value as ChartKind)}
            >
              <option value="area">{t("speculative.chart.band")}</option>
              <option value="line">{t("speculative.chart.line")}</option>
              <option value="bar">{t("speculative.chart.bar")}</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            {volumeChart === "line" ? (
              <LineChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line dataKey="trips" stroke={CHART_COLORS[0]} name={t("analytics.series.trips")} />
              </LineChart>
            ) : volumeChart === "bar" ? (
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trips" fill={CHART_COLORS[0]} />
              </BarChart>
            ) : (
              <AreaChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area dataKey="trips" fill={CHART_COLORS[0]} stroke={CHART_COLORS[0]} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartPanel
            title={t("analytics.charts.ratings")}
            actions={
              <select
                className="border-border rounded-lg border px-2 py-1 text-xs"
                value={ratingChart}
                onChange={(e) => setRatingChart(e.target.value as ChartKind)}
              >
                <option value="bar">{t("speculative.chart.bar")}</option>
                <option value="pie">{t("speculative.chart.pie")}</option>
              </select>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              {ratingChart === "pie" ? (
                <PieChart>
                  <Pie data={ratings} dataKey="count" nameKey="stars" cx="50%" cy="50%" outerRadius={80} label>
                    {ratings.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <BarChart data={ratings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stars" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[4]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title={t("analytics.charts.experience")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={experience} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis type="category" dataKey="metric" width={130} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        <ChartPanel title={t("analytics.charts.destinations")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                <th className="py-2">{t("analytics.table.destination")}</th>
                <th className="py-2">{t("analytics.table.trips")}</th>
                <th className="py-2">{t("analytics.table.share")}</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((d) => (
                <tr key={d.city} className="border-border border-b">
                  <td className="py-2 font-medium">{d.city}</td>
                  <td className="py-2">{d.trips.toLocaleString()}</td>
                  <td className="py-2">{d.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartPanel>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-3">
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
