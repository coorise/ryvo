"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { vehiclesService } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

export function PortalKycCarsTab() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["portal", "vehicles"],
    queryFn: () => vehiclesService.listMine(accessToken),
    enabled: Boolean(accessToken),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => vehiclesService.remove(accessToken, id),
    onSuccess: () => {
      toast.success(t("portal.kyc.carDeleted"));
      void qc.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vehicles = listQ.data?.vehicles ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{t("portal.kyc.carsHint")}</p>
        <Link href="/driver/main/kyc/cars/new">
          <RyvoButton intent="cta" size="sm">
            <Plus className="size-4" /> {t("portal.kyc.addCar")}
          </RyvoButton>
        </Link>
      </div>

      {listQ.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : vehicles.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("portal.kyc.noCars")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="border-border rounded-2xl border p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Car className="text-primary size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {v.brand || v.make} {v.name || v.model} ({v.year})
                    </p>
                    <p className="text-muted-foreground text-xs">{v.plate ?? "—"}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
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
                <p className="text-destructive mb-2 text-xs">{v.rejection_reason}</p>
              ) : null}
              <p className="text-muted-foreground mb-3 text-xs">
                {t("portal.kyc.galleryImage")}: {v.image_keys?.length ?? 0} ·{" "}
                {t("portal.kyc.documentsSection")}: {v.documents.length}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/driver/main/kyc/cars/${v.id}`}>
                  <RyvoButton intent="outline" size="sm">
                    <Eye className="size-3.5" /> {t("portal.kyc.viewCar")}
                  </RyvoButton>
                </Link>
                <Link href={`/driver/main/kyc/cars/${v.id}/edit`}>
                  <RyvoButton intent="outline" size="sm">
                    <Pencil className="size-3.5" /> {t("portal.kyc.editCar")}
                  </RyvoButton>
                </Link>
                <RyvoButton intent="danger" size="sm" onClick={() => deleteM.mutate(v.id)}>
                  <Trash2 className="size-3.5" />
                </RyvoButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
