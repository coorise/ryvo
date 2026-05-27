"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { MessageComposeForm } from "@/components/admin/communication/message-compose-form";
import { PermissionGate } from "@/guards/permission-gate";
import { PERMISSIONS, QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { messagesService } from "@/services/messages.service";

export default function EditMessageCampaignPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.admin.messageCampaign(id),
    queryFn: () => messagesService.getById(accessToken, id),
    enabled: Boolean(accessToken && id),
  });

  const campaign = data?.campaign;

  return (
    <PermissionGate
      permissions={[PERMISSIONS.communication.messagesUpdate, PERMISSIONS.support.reply]}
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
          <h1 className="mt-2 text-2xl font-bold">{t("communication.messages.editTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("communication.messages.composeSubtitle")}</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : isError || !campaign ? (
          <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
        ) : (
          <MessageComposeForm mode="edit" campaign={campaign} />
        )}
      </div>
    </PermissionGate>
  );
}
