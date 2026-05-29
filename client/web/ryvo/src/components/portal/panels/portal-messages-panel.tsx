"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  AdminListStack,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { useAuth } from "@/hooks/use-auth";
import { formatLastSeen } from "@/lib/format-date";
import { messagesService } from "@/services/messages.service";

export function PortalMessagesPanel({
  audience = "drivers",
}: {
  audience?: "clients" | "drivers";
}) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", "driver-messages"],
    queryFn: () => messagesService.list(accessToken, audience),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const campaigns = data?.campaigns ?? [];

  return (
    <AdminListStack>
      {isError ? (
        <p className="text-muted-foreground text-sm">{t("portal.messages.unavailable")}</p>
      ) : (
        <AdminTableCard>
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th>{t("portal.messages.columns.subject")}</th>
                <th>{t("portal.messages.columns.status")}</th>
                <th>{t("portal.messages.columns.sent")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="max-w-xs truncate text-sm font-medium">{c.body_template}</td>
                    <td>
                      <StatusBadge variant="default">{c.status}</StatusBadge>
                    </td>
                    <td className="text-sm">{formatLastSeen(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}
    </AdminListStack>
  );
}
