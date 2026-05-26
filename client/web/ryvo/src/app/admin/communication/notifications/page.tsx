"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { NotificationsInboxPanel } from "@/components/admin/communication/notifications-inbox-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS } from "@/configs/const";

export default function CommunicationNotificationsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permissions={[PERMISSIONS.settings.notificationsRead, "support:read"]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <div className="space-y-6">
        <AdminPageHeader
          title={t("nav.notifications")}
          subtitle={t("communication.notifications.subtitle")}
        />
        <NotificationsInboxPanel />
      </div>
    </PermissionGate>
  );
}
