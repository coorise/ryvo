"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { MessageComposeForm } from "@/components/admin/communication/message-compose-form";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS, ROUTES } from "@/configs/const";

export default function NewMessageCampaignPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permissions={[PERMISSIONS.communication.messagesCreate, PERMISSIONS.support.reply]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <div className="space-y-6">
        <div>
          <Link
            href={ROUTES.admin.communication.messages}
            className="text-muted-foreground text-sm hover:underline"
          >
            ← {t("nav.messages")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t("communication.messages.create")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("communication.messages.composeSubtitle")}</p>
        </div>
        <MessageComposeForm mode="create" />
      </div>
    </PermissionGate>
  );
}
