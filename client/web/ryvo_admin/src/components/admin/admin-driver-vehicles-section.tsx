"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PermissionGate } from "@/guards/permission-gate";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KYC_STATUS, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { vehiclesService, type DriverVehicle } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

type AdminDriverVehiclesSectionProps = {
  driverId: string;
  vehicles: DriverVehicle[];
};

export function AdminDriverVehiclesSection({ driverId, vehicles }: AdminDriverVehiclesSectionProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [viewDoc, setViewDoc] = useState<{ vehicleId: string; docId: string } | null>(null);

  const viewQ = useQuery({
    queryKey: ["admin", "vehicle-doc", viewDoc],
    queryFn: () =>
      vehiclesService.adminGetDocumentViewUrl(accessToken, viewDoc!.vehicleId, viewDoc!.docId),
    enabled: Boolean(accessToken && viewDoc),
  });

  const reviewVehicle = useMutation({
    mutationFn: (p: { vehicleId: string; status: "approved" | "rejected" }) =>
      vehiclesService.reviewVehicle(accessToken, p.vehicleId, p.status),
    onSuccess: () => {
      toast.success(t("drivers.reviewed"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(driverId) });
    },
  });

  return (
    <div className="border-border bg-card rounded-3xl border p-6">
      <p className="mb-4 text-lg font-bold">{t("drivers.carsTitle")}</p>
      {vehicles.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("portal.kyc.noCars")}</p>
      ) : (
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div key={v.id} className="border-border rounded-xl border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Car className="text-primary size-4" />
                  <p className="font-semibold">
                    {v.brand || v.make} {v.name || v.model} · {v.plate ?? "—"}
                  </p>
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
              <PermissionGate permissions={[PERMISSIONS.drivers.kycVerify]}>
                <div className="mb-3 flex gap-2">
                  {v.status === KYC_STATUS.pending && (
                    <>
                      <RyvoButton
                        intent="cta"
                        size="sm"
                        onClick={() => reviewVehicle.mutate({ vehicleId: v.id, status: "approved" })}
                      >
                        {t("drivers.approve")}
                      </RyvoButton>
                      <RyvoButton
                        intent="danger"
                        size="sm"
                        onClick={() => reviewVehicle.mutate({ vehicleId: v.id, status: "rejected" })}
                      >
                        {t("drivers.reject")}
                      </RyvoButton>
                    </>
                  )}
                </div>
              </PermissionGate>
              <ul className="space-y-1 text-xs">
                {v.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span>
                      {d.doc_type} · {d.status}
                    </span>
                    <button
                      type="button"
                      className="text-primary inline-flex items-center gap-1"
                      onClick={() => setViewDoc({ vehicleId: v.id, docId: d.id })}
                    >
                      <Eye className="size-3" /> {t("drivers.viewDocument")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(viewDoc)} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("drivers.viewDocument")}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 min-h-[240px] rounded-xl border p-2">
            {viewQ.data?.url && viewQ.data.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewQ.data.url} alt="" className="max-h-[55vh] w-full object-contain" />
            ) : viewQ.data?.url ? (
              <iframe title="doc" src={viewQ.data.url} className="h-[55vh] w-full" />
            ) : null}
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
