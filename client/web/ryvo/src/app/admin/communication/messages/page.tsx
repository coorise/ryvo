"use client";

import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { MessagesCampaignPanel } from "@/components/admin/communication/messages-campaign-panel";
import { PermissionGate } from "@/guards/permission-gate";

export default function CommunicationMessagesPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={["support:reply"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader title={t("nav.messages")} subtitle={t("communication.messages.pageSubtitle")} />
        <MessagesCampaignPanel />
      </div>
    </PermissionGate>
  );
}
