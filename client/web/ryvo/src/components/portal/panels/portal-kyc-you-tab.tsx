"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KYC_DOC_LABEL_KEYS, KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { kycService } from "@/services/kyc.service";
import { storageService } from "@/services/storage.service";
import type { KycDocument } from "@/services/drivers.service";
import { cn } from "@/lib/utils";

const PERSONAL_DOC_TYPES = [
  "national_id",
  "passport",
  "selfie_with_id",
  "driver_license",
  "bank_statement",
] as const;

const DOC_STATUS_CLASS: Record<string, string> = {
  [KYC_STATUS.approved]: "bg-primary/15 text-primary",
  [KYC_STATUS.pending]: "bg-amber-500/15 text-amber-700",
  [KYC_STATUS.rejected]: "bg-destructive/15 text-destructive",
};

function docRow(docType: string, doc?: KycDocument): KycDocument {
  return (
    doc ?? {
      id: docType,
      driver_id: "",
      doc_type: docType,
      s3_key: "",
      status: "missing",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "",
    }
  );
}

export function PortalKycYouTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateDocType, setUpdateDocType] = useState<string | null>(null);
  const [viewDocType, setViewDocType] = useState<string | null>(null);

  const checklistQ = useQuery({
    queryKey: ["portal", "kyc-checklist"],
    queryFn: () => kycService.getChecklist(accessToken),
    enabled: Boolean(accessToken),
  });

  const viewQ = useQuery({
    queryKey: ["portal", "kyc-view", viewDocType],
    queryFn: () => kycService.getDocumentViewUrl(accessToken, viewDocType!),
    enabled: Boolean(accessToken && viewDocType),
    retry: false,
  });

  const uploadM = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `drivers/${user!.id}/kyc/${docType}/${Date.now()}.${ext}`;
      const s3Key = await storageService.uploadFile(accessToken, file, path);
      return kycService.submitDocument(accessToken, docType, s3Key);
    },
    onSuccess: () => {
      toast.success(t("portal.kyc.uploaded"));
      setUpdateDocType(null);
      void qc.invalidateQueries({ queryKey: ["portal", "kyc-checklist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const docsByType = checklistQ.data?.documents ?? {};
  const rows = PERSONAL_DOC_TYPES.map((type) => docRow(type, docsByType[type]));

  const viewUrl = viewQ.data?.url;
  const viewMime = viewQ.data?.mime_type ?? "";
  const isPdf = viewMime.includes("pdf");
  const isImage = viewMime.startsWith("image/");

  return (
    <div className="space-y-4">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-semibold">{t("portal.kyc.statusLabel")}</p>
          <p className="text-muted-foreground text-sm">{t("portal.kyc.subtitle")}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase",
            DOC_STATUS_CLASS[checklistQ.data?.kyc_status ?? KYC_STATUS.pending] ?? "bg-muted",
          )}
        >
          {checklistQ.data?.kyc_status ?? KYC_STATUS.pending}
        </span>
      </div>

      <div className="border-border bg-card rounded-3xl border p-6">
        <p className="mb-4 text-lg font-bold">{t("drivers.documents")}</p>
        <div className="space-y-3">
          {rows.map((doc) => {
            const hasFile = Boolean(doc.s3_key && !doc.s3_key.startsWith("pending/"));
            const canView = hasFile;
            return (
              <div
                key={doc.doc_type}
                className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-semibold">
                    {t(KYC_DOC_LABEL_KEYS[doc.doc_type] ?? doc.doc_type)}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      DOC_STATUS_CLASS[doc.status] ?? "bg-muted",
                    )}
                  >
                    {doc.status}
                  </span>
                  {doc.rejection_reason && doc.status === KYC_STATUS.rejected ? (
                    <p className="text-destructive mt-1 text-xs">{doc.rejection_reason}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <RyvoButton
                    intent="outline"
                    size="sm"
                    disabled={!canView}
                    onClick={() => setViewDocType(doc.doc_type)}
                  >
                    <Eye className="mr-1 size-3.5" /> {t("drivers.viewDocument")}
                  </RyvoButton>
                  <RyvoButton
                    intent="cta"
                    size="sm"
                    disabled={uploadM.isPending}
                    onClick={() => {
                      setUpdateDocType(doc.doc_type);
                      fileRef.current?.click();
                    }}
                  >
                    <Upload className="mr-1 size-3.5" /> {t("portal.kyc.update")}
                  </RyvoButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && updateDocType) uploadM.mutate({ docType: updateDocType, file });
          e.target.value = "";
        }}
      />

      <Dialog open={Boolean(viewDocType)} onOpenChange={(open) => !open && setViewDocType(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {viewDocType ? t(KYC_DOC_LABEL_KEYS[viewDocType] ?? viewDocType) : ""}
            </DialogTitle>
            <DialogDescription>{t("drivers.viewDocumentHint")}</DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 flex min-h-[240px] max-h-[60vh] items-center justify-center overflow-auto rounded-xl border p-2">
            {viewQ.isLoading && <p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
            {viewQ.isError && <p className="text-destructive text-sm">{t("drivers.viewDocumentError")}</p>}
            {viewUrl && isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewUrl} alt="" className="max-h-[55vh] max-w-full object-contain" />
            )}
            {viewUrl && isPdf && (
              <iframe title="document" src={viewUrl} className="h-[55vh] w-full rounded-lg" />
            )}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
