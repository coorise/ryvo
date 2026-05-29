"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminListStack, StatusBadge } from "@/components/admin/admin-list-ui";
import { KYC_DOC_LABEL_KEYS, KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { driversService } from "@/services/drivers.service";
import { cn } from "@/lib/utils";

const DOC_STATUS_CLASS: Record<string, string> = {
  [KYC_STATUS.approved]: "bg-primary/15 text-primary",
  [KYC_STATUS.pending]: "bg-amber-500/15 text-amber-700",
  [KYC_STATUS.rejected]: "bg-destructive/15 text-destructive",
};

export function PortalDriverKycPanel() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", "driver-kyc", user?.id],
    queryFn: () => driversService.getDriver(accessToken, user!.id),
    enabled: Boolean(accessToken) && Boolean(user?.id),
    retry: false,
  });

  const driver = data?.driver;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  if (isError || !driver) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("portal.kyc.unavailable")}
      </p>
    );
  }

  return (
    <AdminListStack>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">{driver.full_name ?? driver.email}</p>
          <p className="text-muted-foreground text-sm">{t("portal.kyc.statusLabel")}</p>
        </div>
        <StatusBadge variant={driver.kyc_status === KYC_STATUS.approved ? "success" : "warning"}>
          {driver.kyc_status}
        </StatusBadge>
      </div>
      <ul className="space-y-3">
        {(driver.documents ?? []).map((doc) => (
          <li
            key={doc.id}
            className="border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {t(KYC_DOC_LABEL_KEYS[doc.doc_type] ?? "drivers.documents.other")}
              </p>
              {doc.rejection_reason ? (
                <p className="text-destructive text-xs">{doc.rejection_reason}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                DOC_STATUS_CLASS[doc.status] ?? "bg-muted",
              )}
            >
              {doc.status}
            </span>
          </li>
        ))}
      </ul>
      {(driver.documents ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("portal.kyc.noDocuments")}</p>
      ) : null}
    </AdminListStack>
  );
}
