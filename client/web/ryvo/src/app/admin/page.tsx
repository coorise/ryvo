"use client";

import {
  AlertTriangle,
  ArrowRight,
  Car,
  DollarSign,
  Loader2,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { APP_NAME } from "@/configs/const";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { cn } from "@/lib/utils";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminHomePage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24">
        <Loader2 className="size-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : t("common.noData")}
      </p>
    );
  }

  const stats = [
    {
      icon: Car,
      label: t("admin.rides24h"),
      value: data.stats.rides_24h.toLocaleString(),
    },
    {
      icon: DollarSign,
      label: t("admin.revenueToday"),
      value: formatMoney(data.stats.revenue_today),
    },
    {
      icon: XCircle,
      label: t("admin.cancelRate"),
      value: `${data.stats.cancel_rate_pct}%`,
    },
    {
      icon: Star,
      label: t("admin.satisfaction"),
      value:
        data.stats.satisfaction_avg != null
          ? `${data.stats.satisfaction_avg}/5`
          : "—",
    },
  ];

  const chart = data.chart;
  const max = Math.max(...chart.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.dashboard")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("admin.subtitle")} · {APP_NAME}
        </p>
      </div>

      {data.alerts.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          {data.alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition hover:-translate-y-px",
                a.severity === "critical" && "border-destructive/40 bg-destructive/5",
                a.severity === "warning" && "border-warning/50 bg-warning/10",
                a.severity === "info" && "border-info/30 bg-info/5",
              )}
            >
              <AlertTriangle
                className={cn(
                  "size-4 shrink-0",
                  a.severity === "critical" && "text-destructive animate-pulse",
                  a.severity === "warning" && "text-warning-foreground",
                  a.severity === "info" && "text-info",
                )}
              />
              <span className="flex-1 text-sm font-semibold">{a.text}</span>
              <ArrowRight className="text-muted-foreground size-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-border bg-card hover:border-primary rounded-3xl border p-5 transition"
          >
            <div className="bg-muted flex size-10 items-center justify-center rounded-2xl">
              <s.icon className="size-5" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="text-muted-foreground mt-1 text-xs tracking-wider uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border-border bg-card rounded-3xl border p-6 lg:col-span-2">
          <div className="mb-6">
            <p className="text-lg font-bold">{t("admin.weeklyActivity")}</p>
            <p className="text-muted-foreground text-xs">{t("admin.ridesPerDay")}</p>
          </div>
          {chart.every((c) => c.count === 0) ? (
            <p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>
          ) : (
            <div className="flex h-56 items-end gap-3">
              {chart.map((d, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="from-primary/40 to-primary hover:from-primary hover:to-primary/80 w-full rounded-t-2xl bg-gradient-to-t transition"
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: 8 }}
                  />
                  <span className="text-muted-foreground text-xs font-semibold">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-border bg-card rounded-3xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-bold">{t("admin.pendingDrivers")}</p>
            <Link href="/admin/drivers" className="text-primary text-xs font-semibold">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.pending_drivers.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
          ) : (
            <div className="space-y-3">
              {data.pending_drivers.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-full text-sm font-bold">
                    {d.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {d.city} · {d.id}
                    </p>
                  </div>
                  <span className="text-info text-[10px] font-semibold tracking-wider uppercase">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border-border bg-card rounded-3xl border p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-bold">{t("admin.recentActivity")}</p>
            <Link href="/admin/audit" className="text-primary text-xs font-semibold">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.recent_audit.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
          ) : (
            <div className="space-y-2">
              {data.recent_audit.map((l) => (
                <div
                  key={l.id}
                  className="border-border flex items-center gap-4 border-b py-2 last:border-0"
                >
                  <span className="text-muted-foreground w-12 font-mono text-xs">
                    {new Date(l.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{l.action}</span>
                  <span className="text-muted-foreground text-xs">{l.actor_id ?? "system"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-foreground text-background relative overflow-hidden rounded-3xl p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="bg-primary size-2 animate-pulse rounded-full" />
            <span className="text-xs font-semibold tracking-wider uppercase">
              {t("admin.liveMontreal")}
            </span>
          </div>
          <p className="text-4xl font-bold">{data.live.active_trips.toLocaleString()}</p>
          <p className="text-background/70 text-xs tracking-wider uppercase">
            {t("admin.activeRides")}
          </p>
        </div>
      </div>
    </div>
  );
}
