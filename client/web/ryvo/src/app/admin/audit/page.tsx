"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { ActivityLogsPanel } from "@/components/admin/audit/activity-logs-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function AdminActivityLogsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={[PERMISSIONS.audit.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.activityLogs")} subtitle={t("activity.subtitle")} />
        <ActivityLogsPanel />
      </div>
    </PermissionGate>
  );
}
