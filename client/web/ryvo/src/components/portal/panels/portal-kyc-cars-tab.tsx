"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Eye, LayoutGrid, List, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { MIN_GALLERY_IMAGES } from "@/lib/vehicle-profile";
import { vehiclesService } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

export function PortalKycCarsTab() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [layout, setLayout] = useState<"grid" | "table">("table");

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
        <div className="flex flex-wrap items-center gap-2">
          <RyvoButton
            intent="outline"
            size="sm"
            onClick={() => setLayout("table")}
            className={layout === "table" ? "border-primary" : undefined}
          >
            <List className="size-4" />
          </RyvoButton>
          <RyvoButton
            intent="outline"
            size="sm"
            onClick={() => setLayout("grid")}
            className={layout === "grid" ? "border-primary" : undefined}
          >
            <LayoutGrid className="size-4" />
          </RyvoButton>
          <Link href="/driver/main/kyc/cars/new">
            <RyvoButton intent="cta" size="sm">
              <Plus className="size-4" /> {t("portal.kyc.addCar")}
            </RyvoButton>
          </Link>
        </div>
      </div>

      {listQ.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : vehicles.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("portal.kyc.noCars")}</p>
      ) : layout === "table" ? (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">{t("portal.kyc.tableBrand")}</th>
                <th className="px-4 py-3">{t("portal.kyc.tableName")}</th>
                <th className="px-4 py-3">{t("portal.kyc.tablePlate")}</th>
                <th className="px-4 py-3">{t("portal.kyc.galleryImages")}</th>
                <th className="px-4 py-3">{t("portal.kyc.tableStatus")}</th>
                <th className="px-4 py-3">{t("portal.kyc.tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-border border-t">
                  <td className="px-4 py-3">{v.brand ?? "—"}</td>
                  <td className="px-4 py-3">{v.name ?? "—"}</td>
                  <td className="px-4 py-3">{v.plate ?? "—"}</td>
                  <td className="px-4 py-3">
                    {v.image_keys?.length ?? 0}/{MIN_GALLERY_IMAGES}+
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/driver/main/kyc/cars/${v.id}`}>
                        <RyvoButton intent="outline" size="sm">
                          <Eye className="size-3.5" />
                        </RyvoButton>
                      </Link>
                      <Link href={`/driver/main/kyc/cars/${v.id}/edit`}>
                        <RyvoButton intent="outline" size="sm">
                          <Pencil className="size-3.5" />
                        </RyvoButton>
                      </Link>
                      <RyvoButton intent="danger" size="sm" onClick={() => deleteM.mutate(v.id)}>
                        <Trash2 className="size-3.5" />
                      </RyvoButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="border-border rounded-2xl border p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Car className="text-primary size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {v.brand} {v.name}
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
              <p className="text-muted-foreground mb-3 text-xs">
                {t("portal.kyc.galleryImages")}: {v.image_keys?.length ?? 0}/{MIN_GALLERY_IMAGES}+ ·{" "}
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
