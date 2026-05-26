"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { TasksPanel } from "@/components/admin/settings/tasks-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function SettingsTasksPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={[PERMISSIONS.settings.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.tasks")} subtitle={t("settingsTasks.pageSubtitle")} />
        <TasksPanel />
      </div>
    </PermissionGate>
  );
}
