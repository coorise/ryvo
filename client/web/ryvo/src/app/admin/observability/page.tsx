"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Database, HardDrive, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/use-auth";
import { settingsService } from "@/services/settings.service";
import { cn } from "@/lib/utils";

type MetricCard = {
  label: string;
  used: string;
  limit: string;
  pct: number;
  icon: typeof Database;
};

function ObservabilityContent() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "observability"],
    queryFn: async () => {
      const [general, payment] = await Promise.all([
        settingsService.getGeneral(accessToken).catch(() => null),
        settingsService.getPayment(accessToken).catch(() => null),
      ]);
      return { general, payment };
    },
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  });

  const metrics: MetricCard[] = [
    {
      label: t("observability.database"),
      used: "2.4 GB",
      limit: "8 GB",
      pct: 30,
      icon: Database,
    },
    {
      label: t("observability.storage"),
      used: "12.1 GB",
      limit: "50 GB",
      pct: 24,
      icon: HardDrive,
    },
    {
      label: t("observability.apiTraffic"),
      used: "1.2M",
      limit: "5M req/mo",
      pct: 24,
      icon: Activity,
    },
    {
      label: t("observability.mau"),
      used: "8,420",
      limit: "25,000",
      pct: 34,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("observability.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("observability.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="border-border bg-card rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {m.label}
                </p>
                <Icon className="text-primary size-4" />
              </div>
              <p className="mt-3 text-2xl font-bold">
                {m.used}
                <span className="text-muted-foreground text-sm font-normal"> / {m.limit}</span>
              </p>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    m.pct > 85 ? "bg-destructive" : m.pct > 70 ? "bg-amber-500" : "bg-primary",
                  )}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{m.pct}% {t("observability.used")}</p>
            </div>
          );
        })}
      </div>

      <div className="border-border bg-card grid gap-4 rounded-2xl border p-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">{t("observability.runtime")}</h2>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>
              {t("observability.cpu")}: <span className="text-foreground font-medium">42%</span> (4 cores)
            </li>
            <li>
              {t("observability.ram")}: <span className="text-foreground font-medium">3.1 / 8 GB</span>
            </li>
            <li>
              {t("observability.functions")}:{" "}
              <span className="text-foreground font-medium">ryvo-functions · healthy</span>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">{t("observability.platform")}</h2>
          {isLoading ? (
            <p className="text-muted-foreground mt-3 text-sm">{t("common.loading")}</p>
          ) : (
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                {t("settings.appName")}:{" "}
                <span className="text-foreground font-medium">
                  {data?.general?.preferences.appName ?? "—"}
                </span>
              </li>
              <li>
                {t("settingsHub.payment.currency")}:{" "}
                <span className="text-foreground font-medium">
                  {data?.payment?.config.currency ?? "—"}
                </span>
              </li>
              <li>{t("observability.hint")}</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminObservabilityPage() {
  return <ObservabilityContent />;
}
