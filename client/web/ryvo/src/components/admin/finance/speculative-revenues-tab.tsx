"use client";

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
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useOpexConfig } from "@/hooks/use-opex-config";
import {
  buildFinanceTrend,
  monthlyOpex,
  roiPercent,
  type PeriodFilter,
} from "@/lib/finance-speculative";
import { exportElementToPdf } from "@/lib/export-pdf";
import { CHART_COLORS } from "@/lib/analytics-demo";
import { cn } from "@/lib/utils";

const PLATFORM_FEE_DEFAULT = 20;

export function SpeculativeRevenuesTab() {
  const { t } = useTranslation();
  const { resources, hydrated } = useOpexConfig();
  const { data: dashboard } = useAdminDashboard();
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const [mainChart, setMainChart] = useState<"line" | "area" | "bar">("line");
  const [detailChart, setDetailChart] = useState<"pie" | "bar">("pie");
  const exportRef = useRef<HTMLDivElement>(null);

  const baseRevenue = Math.max(
    (dashboard?.stats.revenue_today ?? 1200) * 30,
    28000,
  );

  const trend = useMemo(() => {
    if (!hydrated) return [];
    return buildFinanceTrend(period, resources, baseRevenue, PLATFORM_FEE_DEFAULT);
  }, [period, resources, baseRevenue, hydrated]);

  const totals = useMemo(() => {
    const opex = trend.reduce((s, p) => s + p.opex, 0);
    const rev = trend.reduce((s, p) => s + p.revenue, 0);
    return { opex, rev, roi: roiPercent(rev, opex) };
  }, [trend]);

  const monthly = monthlyOpex(resources);
  const breakdown = useMemo(() => {
    const last = trend[trend.length - 1];
    if (!last) return [];
    return [
      { name: t("speculative.revenue.clientsPaid"), value: last.clientsPaid, fill: CHART_COLORS[0] },
      { name: t("speculative.revenue.driversEarned"), value: last.driversEarned, fill: CHART_COLORS[1] },
      { name: t("speculative.revenue.platformFee"), value: last.platformFee, fill: CHART_COLORS[2] },
      { name: t("speculative.revenue.opex"), value: last.opex, fill: CHART_COLORS[3] },
    ];
  }, [trend, t]);

  async function exportPdf() {
    if (!exportRef.current) return;
    await exportElementToPdf(
      exportRef.current,
      `ryvo-speculative-${period}-${Date.now()}`,
      t("speculative.title"),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`speculative.period.${p}`)}
            </button>
          ))}
        </div>
        <RyvoButton intent="outline" onClick={() => void exportPdf()}>
          <FileDown className="size-4" /> {t("speculative.exportPdf")}
        </RyvoButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("speculative.revenue.totalRevenue")} value={`$${totals.rev.toLocaleString()}`} />
        <Stat label={t("speculative.revenue.totalOpex")} value={`$${totals.opex.toLocaleString()}`} />
        <Stat
          label={t("speculative.revenue.roi")}
          value={`${totals.roi}%`}
          hint={`${t("speculative.revenue.opexBand")}: $${monthly.low.toFixed(0)}–$${monthly.high.toFixed(0)}/mo`}
        />
      </div>

      <div ref={exportRef} className="space-y-6 bg-background p-1">
        <ChartPanel
          title={t("speculative.revenue.trendTitle")}
          description={t("speculative.revenue.trendDesc")}
          actions={
            <select
              className="border-border rounded-lg border px-2 py-1 text-xs"
              value={mainChart}
              onChange={(e) => setMainChart(e.target.value as "line" | "area" | "bar")}
            >
              <option value="line">{t("speculative.chart.line")}</option>
              <option value="area">{t("speculative.chart.band")}</option>
              <option value="bar">{t("speculative.chart.bar")}</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            {mainChart === "line" ? (
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="opex" stroke={CHART_COLORS[3]} strokeWidth={2} name="OPEX" />
                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke={CHART_COLORS[1]} strokeWidth={2} name="Profit" />
              </LineChart>
            ) : mainChart === "area" ? (
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="opex" stackId="1" fill={CHART_COLORS[3]} stroke={CHART_COLORS[3]} />
                <Area type="monotone" dataKey="revenue" stackId="2" fill={CHART_COLORS[0]} stroke={CHART_COLORS[0]} />
              </AreaChart>
            ) : (
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="opex" fill={CHART_COLORS[3]} name="OPEX" />
                <Bar dataKey="revenue" fill={CHART_COLORS[0]} name="Revenue" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartPanel
            title={t("speculative.revenue.breakdownTitle")}
            actions={
              <select
                className="border-border rounded-lg border px-2 py-1 text-xs"
                value={detailChart}
                onChange={(e) => setDetailChart(e.target.value as "pie" | "bar")}
              >
                <option value="pie">{t("speculative.chart.pie")}</option>
                <option value="bar">{t("speculative.chart.bar")}</option>
              </select>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              {detailChart === "pie" ? (
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={breakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title={t("speculative.revenue.tableTitle")}>
            <div className="max-h-[240px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="py-2 pr-2">{t("speculative.revenue.period")}</th>
                    <th className="py-2 pr-2">OPEX</th>
                    <th className="py-2 pr-2">Rev</th>
                    <th className="py-2">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row) => (
                    <tr key={row.label} className="border-border border-b">
                      <td className="py-2 font-medium">{row.label}</td>
                      <td className="py-2">${row.opex.toLocaleString()}</td>
                      <td className="py-2">${row.revenue.toLocaleString()}</td>
                      <td className="py-2">{roiPercent(row.revenue, row.opex)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartPanel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}
