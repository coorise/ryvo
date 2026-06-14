"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Car, Star, XCircle } from "lucide-react";

import { AdminListStack, AdminStatCard, AdminStatGrid } from "@/components/admin/admin-list-ui";
import { useAuth } from "@/hooks/use-auth";
import { portalService } from "@/services/portal.service";
import type { PortalArea } from "@/configs/portal-nav";

type PortalAnalyticsPanelProps = {
  area: PortalArea;
};

export function PortalAnalyticsPanel({ area }: PortalAnalyticsPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", area, "analytics-trips"],
    queryFn: () => portalService.listMyTrips(accessToken, 500),
    enabled: Boolean(accessToken),
  });

  const stats = useMemo(() => {
    const trips = data?.trips ?? [];
    const completed = trips.filter((tr) => tr.status === "completed").length;
    const cancelled = trips.filter((tr) => tr.status === "cancelled" || tr.status === "canceled").length;
    return { total: trips.length, completed, cancelled };
  }, [data?.trips]);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  if (isError) {
    return <p className="text-muted-foreground text-sm">{t("portal.analytics.unavailable")}</p>;
  }

  return (
    <AdminListStack>
      <AdminStatGrid>
        <AdminStatCard icon={BarChart3} label={t("portal.analytics.totalTrips")} value={String(stats.total)} />
        <AdminStatCard icon={Car} label={t("portal.analytics.completed")} value={String(stats.completed)} />
        <AdminStatCard icon={XCircle} label={t("portal.analytics.cancelled")} value={String(stats.cancelled)} />
        <AdminStatCard icon={Star} label={t("portal.analytics.area")} value={area === "driver" ? "Driver" : "Client"} />
      </AdminStatGrid>
      <p className="text-muted-foreground text-sm">{t("portal.analytics.hint")}</p>
    </AdminListStack>
  );
}
