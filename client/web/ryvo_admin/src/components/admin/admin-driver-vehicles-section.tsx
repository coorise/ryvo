"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Eye } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KYC_STATUS, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import {
  vehiclesService,
  VEHICLE_DOC_LABEL_KEYS,
  type DriverVehicle,
  type VehicleDocument,
} from "@/services/vehicles.service";
import { cn } from "@/lib/utils";
import { isRealStorageKey } from "@/lib/storage-keys";

type AdminDriverVehiclesSectionProps = {
  driverId: string;
  vehicles: DriverVehicle[];
};

type RejectTarget =
  | { kind: "vehicle"; vehicleId: string }
  | { kind: "document"; vehicleId: string; docId: string };

function energyLabel(value: string | null, t: (k: string) => string): string {
  if (!value) return "—";
  const key = `drivers.energy.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

export function AdminDriverVehiclesSection({ driverId, vehicles }: AdminDriverVehiclesSectionProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [viewDoc, setViewDoc] = useState<{ vehicleId: string; docId: string } | null>(null);
  const [viewMedia, setViewMedia] = useState<{ vehicleId: string; key: string; label: string } | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const defaultRejectReason = t("drivers.defaultRejectReason");

  useEffect(() => {
    if (rejectTarget) setRejectReason(defaultRejectReason);
  }, [rejectTarget, defaultRejectReason]);

  const viewDocQ = useQuery({
    queryKey: ["admin", "vehicle-doc", viewDoc],
    queryFn: () =>
      vehiclesService.adminGetDocumentViewUrl(accessToken, viewDoc!.vehicleId, viewDoc!.docId),
    enabled: Boolean(accessToken && viewDoc),
  });

  const viewMediaQ = useQuery({
    queryKey: ["admin", "vehicle-media", viewMedia],
    queryFn: () =>
      vehiclesService.adminGetMediaViewUrl(accessToken, viewMedia!.vehicleId, viewMedia!.key),
    enabled: Boolean(accessToken && viewMedia),
  });

  const reviewVehicle = useMutation({
    mutationFn: (p: { vehicleId: string; status: "approved" | "rejected"; reason?: string }) =>
      vehiclesService.reviewVehicle(accessToken, p.vehicleId, p.status, p.reason),
    onSuccess: () => {
      toast.success(t("drivers.reviewed"));
      setRejectTarget(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(driverId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewDoc = useMutation({
    mutationFn: (p: {
      vehicleId: string;
      docId: string;
      status: "approved" | "rejected";
      reason?: string;
    }) =>
      vehiclesService.reviewVehicleDocument(
        accessToken,
        p.vehicleId,
        p.docId,
        p.status,
        p.reason,
      ),
    onSuccess: () => {
      toast.success(t("drivers.reviewed"));
      setRejectTarget(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(driverId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || defaultRejectReason;
    if (rejectTarget.kind === "vehicle") {
      reviewVehicle.mutate({ vehicleId: rejectTarget.vehicleId, status: "rejected", reason });
    } else {
      reviewDoc.mutate({
        vehicleId: rejectTarget.vehicleId,
        docId: rejectTarget.docId,
        status: "rejected",
        reason,
      });
    }
  }

  const viewDocUrl = viewDocQ.data?.url;
  const viewDocMime = viewDocQ.data?.mime_type ?? "";
  const viewMediaUrl = viewMediaQ.data?.url;
  const viewMediaMime = viewMediaQ.data?.mime_type ?? "";

  return (
    <div className="border-border bg-card rounded-3xl border p-6">
      <p className="mb-1 text-lg font-bold">{t("drivers.carsTitle")}</p>
      <p className="text-muted-foreground mb-6 text-sm">{t("drivers.carsHint")}</p>

      {vehicles.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("drivers.noCarsYet")}</p>
      ) : (
        <div className="space-y-6">
          {vehicles.map((v) => (
            <VehicleReviewCard
              key={v.id}
              vehicle={v}
              onViewDoc={(docId) => setViewDoc({ vehicleId: v.id, docId })}
              onViewMedia={(key, label) => setViewMedia({ vehicleId: v.id, key, label })}
              onApproveVehicle={() => reviewVehicle.mutate({ vehicleId: v.id, status: "approved" })}
              onRejectVehicle={() => setRejectTarget({ kind: "vehicle", vehicleId: v.id })}
              onApproveDoc={(docId) =>
                reviewDoc.mutate({ vehicleId: v.id, docId, status: "approved" })
              }
              onRejectDoc={(docId) =>
                setRejectTarget({ kind: "document", vehicleId: v.id, docId })
              }
              reviewPending={reviewVehicle.isPending || reviewDoc.isPending}
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(viewDoc)} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("drivers.viewDocument")}</DialogTitle>
            <DialogDescription>{t("drivers.viewDocumentHint")}</DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 flex min-h-[240px] max-h-[60vh] items-center justify-center overflow-auto rounded-xl border p-2">
            {viewDocQ.isLoading && (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            )}
            {viewDocQ.isError && (
              <p className="text-destructive text-sm">{t("drivers.viewDocumentError")}</p>
            )}
            {viewDocUrl && viewDocMime.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewDocUrl} alt="" className="max-h-[55vh] max-w-full object-contain" />
            )}
            {viewDocUrl && viewDocMime.includes("pdf") && (
              <iframe title="doc" src={viewDocUrl} className="h-[55vh] w-full rounded-lg" />
            )}
            {viewDocUrl && !viewDocMime.startsWith("image/") && !viewDocMime.includes("pdf") && (
              <a
                href={viewDocUrl}
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

      <Dialog open={Boolean(viewMedia)} onOpenChange={(open) => !open && setViewMedia(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{viewMedia?.label ?? t("drivers.viewMedia")}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 flex min-h-[240px] max-h-[60vh] items-center justify-center overflow-auto rounded-xl border p-2">
            {viewMediaQ.isLoading && (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            )}
            {viewMediaUrl && viewMediaMime.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewMediaUrl} alt="" className="max-h-[55vh] max-w-full object-contain" />
            )}
            {viewMediaUrl && viewMediaMime.startsWith("video/") && (
              <video src={viewMediaUrl} controls className="max-h-[55vh] max-w-full" />
            )}
            {viewMediaUrl && !viewMediaMime.startsWith("image/") && !viewMediaMime.startsWith("video/") && (
              <a
                href={viewMediaUrl}
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
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
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
            <Label htmlFor="vehicle-reject-reason">{t("drivers.rejectReason")}</Label>
            <Textarea
              id="vehicle-reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="danger"
              disabled={reviewVehicle.isPending || reviewDoc.isPending}
              onClick={confirmReject}
            >
              {t("drivers.confirmReject")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type VehicleReviewCardProps = {
  vehicle: DriverVehicle;
  onViewDoc: (docId: string) => void;
  onViewMedia: (key: string, label: string) => void;
  onApproveVehicle: () => void;
  onRejectVehicle: () => void;
  onApproveDoc: (docId: string) => void;
  onRejectDoc: (docId: string) => void;
  reviewPending: boolean;
};

function VehicleReviewCard({
  vehicle: v,
  onViewDoc,
  onViewMedia,
  onApproveVehicle,
  onRejectVehicle,
  onApproveDoc,
  onRejectDoc,
  reviewPending,
}: VehicleReviewCardProps) {
  const { t } = useTranslation();

  const specRows: { label: string; value: string }[] = [
    { label: t("drivers.vehicleFields.brand"), value: v.brand ?? v.make ?? "—" },
    { label: t("drivers.vehicleFields.name"), value: v.name ?? v.model ?? "—" },
    { label: t("drivers.vehicleFields.plate"), value: v.plate ?? "—" },
    { label: t("drivers.vehicleFields.year"), value: String(v.year ?? "—") },
    { label: t("drivers.vehicleFields.energy"), value: energyLabel(v.energy_type, t) },
    { label: t("drivers.vehicleFields.speed"), value: v.max_speed_kmh != null ? `${v.max_speed_kmh} km/h` : "—" },
    { label: t("drivers.vehicleFields.age"), value: v.age_years != null ? `${v.age_years} y` : "—" },
    { label: t("drivers.vehicleFields.tyres"), value: v.tyres_type ?? "—" },
    {
      label: t("drivers.vehicleFields.carbon"),
      value: v.carbon_print != null ? String(v.carbon_print) : "—",
    },
    { label: t("drivers.vehicleFields.color"), value: v.color ?? "—" },
    { label: t("drivers.vehicleFields.category"), value: v.category ?? "—" },
  ];

  return (
    <div className="border-border rounded-2xl border p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="text-primary size-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {v.brand || v.make} {v.name || v.model}
            </p>
            <p className="text-muted-foreground text-xs">
              {v.plate ?? "—"} · {v.year}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
            v.status === KYC_STATUS.approved
              ? "bg-primary/15 text-primary"
              : v.status === KYC_STATUS.rejected
                ? "bg-destructive/15 text-destructive"
                : "bg-amber-500/15 text-amber-700",
          )}
        >
          {v.status}
        </span>
      </div>

      {v.rejection_reason && v.status === KYC_STATUS.rejected ? (
        <p className="text-destructive mb-3 text-xs">{v.rejection_reason}</p>
      ) : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {specRows.map((row) => (
          <div key={row.label} className="bg-muted/30 rounded-lg px-3 py-2 text-xs">
            <p className="text-muted-foreground">{row.label}</p>
            <p className="font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold">{t("drivers.vehicleMedia")}</p>
        <div className="flex flex-wrap gap-2">
          {v.banner_key && isRealStorageKey(v.banner_key) ? (
            <RyvoButton
              intent="outline"
              size="sm"
              onClick={() => onViewMedia(v.banner_key!, t("drivers.mediaBanner"))}
            >
              <Eye className="size-3.5" /> {t("drivers.mediaBanner")}
            </RyvoButton>
          ) : (
            <span className="text-muted-foreground text-xs">{t("drivers.noBanner")}</span>
          )}
          {(v.image_keys ?? []).filter(isRealStorageKey).map((key, i) => (
            <RyvoButton
              key={key}
              intent="outline"
              size="sm"
              onClick={() => onViewMedia(key, `${t("drivers.mediaGallery")} ${i + 1}`)}
            >
              <Eye className="size-3.5" /> {t("drivers.mediaGallery")} {i + 1}
            </RyvoButton>
          ))}
          {v.video_key && isRealStorageKey(v.video_key) ? (
            <RyvoButton
              intent="outline"
              size="sm"
              onClick={() => onViewMedia(v.video_key!, t("drivers.mediaVideo"))}
            >
              <Eye className="size-3.5" /> {t("drivers.mediaVideo")}
            </RyvoButton>
          ) : null}
        </div>
      </div>

      <PermissionGate permissions={[PERMISSIONS.drivers.kycVerify]}>
        {v.status === KYC_STATUS.pending && (
          <div className="mb-4 flex flex-wrap gap-2">
            <RyvoButton intent="cta" size="sm" disabled={reviewPending} onClick={onApproveVehicle}>
              {t("drivers.approveVehicle")}
            </RyvoButton>
            <RyvoButton intent="danger" size="sm" disabled={reviewPending} onClick={onRejectVehicle}>
              {t("drivers.rejectVehicle")}
            </RyvoButton>
          </div>
        )}
      </PermissionGate>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("drivers.vehicleDocuments")}</p>
        {v.documents.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("drivers.noVehicleDocs")}</p>
        ) : (
          <ul className="space-y-2">
            {v.documents.map((d) => (
              <VehicleDocRow
                key={d.id}
                doc={d}
                onView={() => onViewDoc(d.id)}
                onApprove={() => onApproveDoc(d.id)}
                onReject={() => onRejectDoc(d.id)}
                reviewPending={reviewPending}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type VehicleDocRowProps = {
  doc: VehicleDocument;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  reviewPending: boolean;
};

function VehicleDocRow({ doc: d, onView, onApprove, onReject, reviewPending }: VehicleDocRowProps) {
  const { t } = useTranslation();
  const label =
    d.doc_type === "other" && d.label
      ? d.label
      : t(VEHICLE_DOC_LABEL_KEYS[d.doc_type] ?? d.doc_type);

  return (
    <li className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
      <div>
        <p className="font-medium">{label}</p>
        <span
          className={cn(
            "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            d.status === KYC_STATUS.approved
              ? "bg-primary/15 text-primary"
              : d.status === KYC_STATUS.rejected
                ? "bg-destructive/15 text-destructive"
                : "bg-amber-500/15 text-amber-700",
          )}
        >
          {d.status}
        </span>
        {d.rejection_reason && d.status === KYC_STATUS.rejected ? (
          <p className="text-destructive mt-1">{d.rejection_reason}</p>
        ) : null}
      </div>
      <PermissionGate permissions={[PERMISSIONS.drivers.kycRead, PERMISSIONS.drivers.kycVerify]}>
        <div className="flex flex-wrap gap-1">
          {isRealStorageKey(d.s3_key) ? (
            <RyvoButton intent="outline" size="sm" onClick={onView}>
              <Eye className="size-3" /> {t("drivers.viewDocument")}
            </RyvoButton>
          ) : null}
          <PermissionGate permissions={[PERMISSIONS.drivers.kycVerify]}>
            {d.status === KYC_STATUS.pending && (
              <>
                <RyvoButton intent="cta" size="sm" disabled={reviewPending} onClick={onApprove}>
                  {t("drivers.approve")}
                </RyvoButton>
                <RyvoButton intent="danger" size="sm" disabled={reviewPending} onClick={onReject}>
                  {t("drivers.reject")}
                </RyvoButton>
              </>
            )}
          </PermissionGate>
        </div>
      </PermissionGate>
    </li>
  );
}
