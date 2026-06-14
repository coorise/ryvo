"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PermissionGate } from "@/guards/permission-gate";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KYC_DOC_LABEL_KEYS, KYC_STATUS, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { driversService, type KycDocument } from "@/services/drivers.service";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isRealStorageKey } from "@/lib/storage-keys";

const PERSONAL_KYC_DOC_TYPES = [
  "national_id",
  "passport",
  "selfie_with_id",
  "driver_license",
  "bank_statement",
] as const;

function docByType(documents: KycDocument[], docType: string): KycDocument | undefined {
  return documents.find((d) => d.doc_type === docType);
}

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

function isResubmitted(doc: KycDocument): boolean {
  return doc.status === KYC_STATUS.pending && Boolean(doc.reviewed_at);
}

function canApprove(doc: KycDocument): boolean {
  return doc.status === KYC_STATUS.pending && isRealStorageKey(doc.s3_key);
}

function canView(doc: KycDocument): boolean {
  return doc.status !== "missing" && isRealStorageKey(doc.s3_key);
}

function canReject(doc: KycDocument): boolean {
  return doc.status === KYC_STATUS.approved || doc.status === KYC_STATUS.pending;
}

const DOC_STATUS_CLASS: Record<string, string> = {
  [KYC_STATUS.approved]: "bg-primary/15 text-primary",
  [KYC_STATUS.pending]: "bg-amber-500/15 text-amber-700",
  [KYC_STATUS.rejected]: "bg-destructive/15 text-destructive",
  missing: "bg-muted text-muted-foreground",
};

type DriverDocumentsSectionProps = {
  driverId: string;
  documents: KycDocument[];
};

export function DriverDocumentsSection({ driverId, documents }: DriverDocumentsSectionProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [viewDocType, setViewDocType] = useState<string | null>(null);
  const [rejectDocType, setRejectDocType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const defaultRejectReason = t("drivers.defaultRejectReason");

  useEffect(() => {
    if (rejectDocType) setRejectReason(defaultRejectReason);
  }, [rejectDocType, defaultRejectReason]);

  const viewQuery = useQuery({
    queryKey: QUERY_KEYS.admin.driverDocumentView(driverId, viewDocType ?? ""),
    queryFn: () => driversService.getDocumentViewUrl(accessToken, driverId, viewDocType!),
    enabled: Boolean(accessToken && viewDocType),
  });

  const review = useMutation({
    mutationFn: (p: { docType: string; status: "approved" | "rejected"; reason?: string }) =>
      driversService.reviewDocument(accessToken, driverId, p.docType, p.status, p.reason),
    onSuccess: () => {
      toast.success(t("drivers.reviewed"));
      setRejectDocType(null);
      setRejectReason("");
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(driverId) });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.drivers });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const viewUrl = viewQuery.data?.url;
  const viewMime = viewQuery.data?.mime_type ?? "";
  const isPdf = viewMime.includes("pdf");
  const isImage = viewMime.startsWith("image/");

  const checklist = PERSONAL_KYC_DOC_TYPES.map((docType) =>
    docRow(docType, docByType(documents, docType)),
  );
  const legacyDocs = documents.filter(
    (d) => !(PERSONAL_KYC_DOC_TYPES as readonly string[]).includes(d.doc_type),
  );

  return (
    <div className="border-border bg-card rounded-3xl border p-6">
      <p className="mb-1 text-lg font-bold">{t("drivers.documents")}</p>
      <p className="text-muted-foreground mb-4 text-sm">{t("drivers.documentsHint")}</p>
      <div className="space-y-3">
        {checklist.map((doc) => (
          <DocumentRow
            key={doc.doc_type}
            doc={doc}
            onView={() => canView(doc) && setViewDocType(doc.doc_type)}
            onApprove={() => review.mutate({ docType: doc.doc_type, status: "approved" })}
            onReject={() => setRejectDocType(doc.doc_type)}
            reviewPending={review.isPending}
            viewDisabled={!canView(doc)}
          />
        ))}
        {legacyDocs.map((doc) => (
          <DocumentRow
            key={doc.doc_type}
            doc={doc}
            onView={() => canView(doc) && setViewDocType(doc.doc_type)}
            onApprove={() => review.mutate({ docType: doc.doc_type, status: "approved" })}
            onReject={() => setRejectDocType(doc.doc_type)}
            reviewPending={review.isPending}
            viewDisabled={!canView(doc)}
          />
        ))}
      </div>

      <Dialog open={Boolean(viewDocType)} onOpenChange={(open) => !open && setViewDocType(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {viewDocType
                ? t(KYC_DOC_LABEL_KEYS[viewDocType] ?? viewDocType)
                : t("drivers.viewDocument")}
            </DialogTitle>
            <DialogDescription>{t("drivers.viewDocumentHint")}</DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 flex min-h-[240px] max-h-[60vh] items-center justify-center overflow-auto rounded-xl border p-2">
            {viewQuery.isLoading && (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            )}
            {viewQuery.isError && (
              <p className="text-destructive text-sm">{t("drivers.viewDocumentError")}</p>
            )}
            {viewUrl && isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewUrl} alt="" className="max-h-[55vh] max-w-full object-contain" />
            )}
            {viewUrl && isPdf && (
              <iframe title="document" src={viewUrl} className="h-[55vh] w-full rounded-lg" />
            )}
            {viewUrl && !isImage && !isPdf && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm font-medium underline"
              >
                {t("drivers.openInNewTab")}
              </a>
            )}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectDocType)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDocType(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("drivers.rejectDocumentTitle")}</DialogTitle>
            <DialogDescription>{t("drivers.rejectDocumentHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t("drivers.rejectReason")}</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setRejectDocType(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="danger"
              disabled={review.isPending || !rejectDocType}
              onClick={() => {
                if (!rejectDocType) return;
                review.mutate({
                  docType: rejectDocType,
                  status: "rejected",
                  reason: rejectReason.trim() || defaultRejectReason,
                });
              }}
            >
              {t("drivers.confirmReject")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DocumentRowProps = {
  doc: KycDocument;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  reviewPending: boolean;
  viewDisabled?: boolean;
};

function DocumentRow({
  doc,
  onView,
  onApprove,
  onReject,
  reviewPending,
  viewDisabled,
}: DocumentRowProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{t(KYC_DOC_LABEL_KEYS[doc.doc_type] ?? doc.doc_type)}</p>
          {isResubmitted(doc) && (
            <span className="bg-primary rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
              {t("drivers.newUpload")}
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
            DOC_STATUS_CLASS[doc.status] ?? "bg-muted",
          )}
        >
          {doc.status === "missing" ? t("drivers.docMissing") : doc.status}
        </span>
        {doc.rejection_reason && doc.status === KYC_STATUS.rejected && (
          <p className="text-destructive mt-1 text-xs">{doc.rejection_reason}</p>
        )}
      </div>
      <PermissionGate permissions={[PERMISSIONS.drivers.kycRead, PERMISSIONS.drivers.kycVerify]}>
        <div className="flex flex-wrap gap-2">
          <RyvoButton intent="outline" size="sm" disabled={viewDisabled} onClick={onView}>
            <Eye className="mr-1 size-3.5" />
            {t("drivers.viewDocument")}
          </RyvoButton>
          <PermissionGate permissions={[PERMISSIONS.drivers.kycVerify]}>
            {canApprove(doc) && (
              <RyvoButton intent="cta" size="sm" disabled={reviewPending} onClick={onApprove}>
                {t("drivers.approve")}
              </RyvoButton>
            )}
            {canReject(doc) && doc.status !== "missing" && (
              <RyvoButton intent="danger" size="sm" disabled={reviewPending} onClick={onReject}>
                {t("drivers.reject")}
              </RyvoButton>
            )}
          </PermissionGate>
        </div>
      </PermissionGate>
    </div>
  );
}
