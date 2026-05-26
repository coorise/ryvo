"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { notificationService } from "@/services/notification.service";

export function NotificationsInboxPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications", "inbox"],
    queryFn: () => notificationService.getInbox(accessToken),
    enabled: Boolean(accessToken),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(accessToken, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "notifications", "inbox"] }),
  });

  const rows = data?.notifications ?? [];

  return (
    <AdminListStack>
      <p className="text-muted-foreground text-sm">{t("communication.notifications.hint")}</p>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : (
        <AdminTableCard
          isEmpty={!rows.length}
          empty={
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
          }
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <th className="px-5 py-3.5">{t("communication.notifications.col.when")}</th>
                <th className="px-5 py-3.5">{t("communication.notifications.col.channel")}</th>
                <th className="px-5 py-3.5">{t("communication.notifications.col.type")}</th>
                <th className="px-5 py-3.5">{t("communication.notifications.col.status")}</th>
                <th className="px-5 py-3.5">{t("communication.notifications.col.message")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((n) => {
                const message =
                  typeof n.payload?.message === "string"
                    ? n.payload.message
                    : JSON.stringify(n.payload).slice(0, 120);
                return (
                  <tr
                    key={n.id}
                    className="border-border hover:bg-muted/30 border-t transition"
                    onClick={() => {
                      if (!n.read_at) markRead.mutate(n.id);
                    }}
                  >
                    <td className="text-muted-foreground px-5 py-3 text-xs">
                      {formatLastSeen(n.created_at)}
                    </td>
                    <td className="px-5 py-3 uppercase">{n.channel}</td>
                    <td className="px-5 py-3 font-mono text-xs">{n.type}</td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={n.read_at ? "default" : "success"}>
                        {n.read_at
                          ? t("communication.notifications.read")
                          : t("communication.notifications.unread")}
                      </StatusBadge>
                    </td>
                    <td className="text-muted-foreground max-w-md px-5 py-3 text-sm">{message}</td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}
    </AdminListStack>
  );
}
