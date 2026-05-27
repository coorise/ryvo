"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { SettingsProfileTab } from "@/components/admin/settings/settings-profile-tab";
import { PERMISSIONS } from "@/configs/const";
import { PermissionGate } from "@/guards/permission-gate";

/** Settings → Profile (standalone, no tabs) */
export default function AdminSettingsProfilePage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={[PERMISSIONS.settings.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.profile")} subtitle={t("settingsHub.profile.description")} />
        <SettingsProfileTab />
      </div>
    </PermissionGate>
  );
}

