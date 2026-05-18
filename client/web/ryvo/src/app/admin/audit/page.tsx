"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { auditService } from "@/services/audit.service";

export default function AdminAuditPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => auditService.listLogs(accessToken),
    enabled: Boolean(accessToken),
  });

  return (
    <PermissionGate permissions={["audit:read"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.audit")}</h1>
          <p className="text-muted-foreground text-sm">{t("audit.subtitle")}</p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">{t("rides.created")}</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Actor</th>
                </tr>
              </thead>
              <tbody>
                {(data?.logs ?? []).map((log) => (
                  <tr key={log.id} className="border-border border-t">
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{log.action}</td>
                    <td className="px-4 py-3">
                      {log.target_type ?? "—"}
                      {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ""}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {log.actor_id?.slice(0, 8) ?? "system"}
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
