"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PermissionGate } from "@/guards/permission-gate";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { KYC_DOC_LABEL_KEYS, KYC_STATUS, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { driversService, type DriverDetail, type KycDocument } from "@/services/drivers.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DOC_STATUS_CLASS: Record<string, string> = {
  [KYC_STATUS.approved]: "bg-primary/15 text-primary",
  [KYC_STATUS.pending]: "bg-amber-500/15 text-amber-700",
  [KYC_STATUS.rejected]: "bg-destructive/15 text-destructive",
};

type DriverDocumentsSectionProps = {
  driverId: string;
  documents: KycDocument[];
};

export function DriverDocumentsSection({ driverId, documents }: DriverDocumentsSectionProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [rejectDoc, setRejectDoc] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const review = useMutation({
    mutationFn: (p: { docType: string; status: "approved" | "rejected"; reason?: string }) =>
      driversService.reviewDocument(accessToken, driverId, p.docType, p.status, p.reason),
    onSuccess: () => {
      toast.success(t("drivers.reviewed"));
      setRejectDoc(null);
      setRejectReason("");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(driverId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.drivers });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border-border bg-card rounded-3xl border p-6">
      <p className="mb-4 text-lg font-bold">{t("drivers.documents")}</p>
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.doc_type}
            className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <p className="font-semibold">{t(KYC_DOC_LABEL_KEYS[doc.doc_type] ?? doc.doc_type)}</p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                  DOC_STATUS_CLASS[doc.status] ?? "bg-muted",
                )}
              >
                {doc.status}
              </span>
              {doc.rejection_reason && (
                <p className="text-destructive mt-1 text-xs">{doc.rejection_reason}</p>
              )}
            </div>
            <PermissionGate permissions={[PERMISSIONS.drivers.kycVerify]}>
              {rejectDoc === doc.doc_type ? (
                <div className="flex w-full flex-col gap-2 sm:min-w-[240px]">
                  <Label>{t("drivers.rejectReason")}</Label>
                  <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <RyvoButton
                      intent="danger"
                      size="sm"
                      onClick={() =>
                        review.mutate({
                          docType: doc.doc_type,
                          status: "rejected",
                          reason: rejectReason || t("drivers.defaultRejectReason"),
                        })
                      }
                    >
                      {t("drivers.reject")}
                    </RyvoButton>
                    <RyvoButton intent="outline" size="sm" onClick={() => setRejectDoc(null)}>
                      {t("common.cancel")}
                    </RyvoButton>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <RyvoButton
                    intent="cta"
                    size="sm"
                    onClick={() => review.mutate({ docType: doc.doc_type, status: "approved" })}
                  >
                    {t("drivers.approve")}
                  </RyvoButton>
                  <RyvoButton
                    intent="danger"
                    size="sm"
                    onClick={() => setRejectDoc(doc.doc_type)}
                  >
                    {t("drivers.reject")}
                  </RyvoButton>
                </div>
              )}
            </PermissionGate>
          </div>
        ))}
        {!documents.length && (
          <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
        )}
      </div>
    </div>
  );
}
