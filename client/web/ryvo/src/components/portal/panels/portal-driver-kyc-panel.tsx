"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminListStack, StatusBadge } from "@/components/admin/admin-list-ui";
import { KYC_DOC_LABEL_KEYS, KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { kycService } from "@/services/kyc.service";
import { cn } from "@/lib/utils";

const DOC_STATUS_CLASS: Record<string, string> = {
  [KYC_STATUS.approved]: "bg-primary/15 text-primary",
  [KYC_STATUS.pending]: "bg-amber-500/15 text-amber-700",
  [KYC_STATUS.rejected]: "bg-destructive/15 text-destructive",
};

export function PortalDriverKycPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", "driver-kyc-checklist"],
    queryFn: () => kycService.getChecklist(accessToken),
    enabled: Boolean(accessToken),
    retry: false,
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  if (isError || !data) {
    return <p className="text-muted-foreground text-sm">{t("portal.kyc.unavailable")}</p>;
  }

  const docs = data.required.map((docType) => {
    const doc = data.documents[docType];
    return { doc_type: docType, status: doc?.status ?? "missing", rejection_reason: doc?.rejection_reason };
  });

  return (
    <AdminListStack>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">{t("portal.nav.driverKyc")}</p>
          <p className="text-muted-foreground text-sm">{t("portal.kyc.statusLabel")}</p>
        </div>
        <StatusBadge variant={data.kyc_status === KYC_STATUS.approved ? "success" : "warning"}>
          {data.kyc_status}
        </StatusBadge>
      </div>
      <ul className="space-y-3">
        {docs.map((doc) => (
          <li
            key={doc.doc_type}
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
      <p className="text-muted-foreground text-xs">{t("portal.kyc.uploadHint")}</p>
    </AdminListStack>
  );
}
