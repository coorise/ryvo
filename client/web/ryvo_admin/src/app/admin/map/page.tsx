"use client";

import { PermissionGate } from "@/guards/permission-gate";
import { LiveMapPanel } from "@/components/admin/map/live-map-panel";
import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { PERMISSIONS } from "@/configs/const";
import { useTranslation } from "react-i18next";

export default function AdminMapPage() {
  const { t } = useTranslation();
  return (
    <PermissionGate
      permissions={[PERMISSIONS.map.read, PERMISSIONS.rides.read]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.liveMap")} subtitle={t("map.pageSubtitle")} />
        <LiveMapPanel />
      </div>
    </PermissionGate>
  );
}
