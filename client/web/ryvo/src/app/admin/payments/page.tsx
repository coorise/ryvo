"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { adminService } from "@/services";

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => adminService.listPayments(accessToken),
    enabled: Boolean(accessToken),
  });

  return (
    <PermissionGate permissions={["audit:read"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.payments")}</h1>
          <p className="text-muted-foreground text-sm">{t("payments.subtitle")}</p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{t("payments.amount")}</th>
                  <th className="px-4 py-3">{t("rides.status")}</th>
                  <th className="px-4 py-3">{t("rides.created")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payments ?? []).map((p) => (
                  <tr key={p.id} className="border-border border-t">
                    <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {p.amount} {p.currency}
                    </td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
