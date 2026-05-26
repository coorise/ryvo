"use client";

import { useTranslation } from "react-i18next";

import { AnalyticsDashboard } from "@/components/admin/analytics/analytics-dashboard";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permissions={[PERMISSIONS.analytics.read, PERMISSIONS.audit.read]}
      fallback={<p>{t("common.noData")}</p>}
    >
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("analytics.subtitle")}</p>
      </div>
      <AnalyticsDashboard />
    </div>
    </PermissionGate>
  );
}
