"use client";

import { useQuery } from "@tanstack/react-query";
import { Car, Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { KYC_STATUS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { vehiclesService } from "@/services/vehicles.service";
import { cn } from "@/lib/utils";

type PortalVehicleViewProps = {
  vehicleId: string;
};

export function PortalVehicleView({ vehicleId }: PortalVehicleViewProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "vehicle", vehicleId],
    queryFn: () => vehiclesService.getVehicle(accessToken, vehicleId),
    enabled: Boolean(accessToken && vehicleId),
  });

  const v = data?.vehicle;

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  if (!v) return <p className="text-muted-foreground text-sm">{t("common.noData")}</p>;

  const specs: { label: string; value: string }[] = [
    { label: t("portal.kyc.fields.brand"), value: v.brand ?? v.make ?? "—" },
    { label: t("portal.kyc.fields.name"), value: v.name ?? v.model ?? "—" },
    { label: t("portal.kyc.fields.plate"), value: v.plate ?? "—" },
    { label: t("portal.kyc.fields.year"), value: String(v.year) },
    { label: t("portal.kyc.fields.color"), value: v.color ?? "—" },
    { label: t("portal.kyc.fields.category"), value: v.category ?? "—" },
    {
      label: t("portal.kyc.fields.energy"),
      value: v.energy_type ? t(`portal.kyc.energy.${v.energy_type}`) : "—",
    },
    { label: t("portal.kyc.fields.tyres"), value: v.tyres_type ?? "—" },
    {
      label: t("portal.kyc.fields.speed"),
      value: v.max_speed_kmh != null ? `${v.max_speed_kmh} km/h` : "—",
    },
    {
      label: t("portal.kyc.fields.age"),
      value: v.age_years != null ? `${v.age_years} y` : "—",
    },
    {
      label: t("portal.kyc.fields.carbon"),
      value: v.carbon_print != null ? String(v.carbon_print) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Car className="text-primary size-8" />
          <div>
            <h2 className="text-xl font-bold">
              {v.brand || v.make} {v.name || v.model}
            </h2>
            <p className="text-muted-foreground text-sm">{v.plate ?? "—"}</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[10px] font-bold uppercase",
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
        <p className="text-destructive text-sm">{v.rejection_reason}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((row) => (
          <div key={row.label} className="border-border rounded-xl border px-4 py-3">
            <p className="text-muted-foreground text-xs">{row.label}</p>
            <p className="font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <p className="font-semibold">{t("portal.kyc.mediaSection")}</p>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>
            {t("portal.kyc.banner")}: {v.banner_key ? "✓" : "—"}
          </li>
          <li>
            {t("portal.kyc.galleryImage")}: {v.image_keys?.length ?? 0}
          </li>
          <li>
            {t("portal.kyc.video")}: {v.video_key ? "✓" : "—"}
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">{t("portal.kyc.documentsSection")}</p>
        {v.documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("portal.kyc.noDocs")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {v.documents.map((d) => (
              <li key={d.id}>
                {d.doc_type === "other" && d.label ? d.label : d.doc_type} · {d.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/driver/main/kyc/cars/${vehicleId}/edit`}>
          <RyvoButton intent="cta">
            <Pencil className="size-4" /> {t("portal.kyc.editCar")}
          </RyvoButton>
        </Link>
        <Link href="/driver/main/kyc?tab=cars">
          <RyvoButton intent="outline">{t("portal.kyc.backToCars")}</RyvoButton>
        </Link>
      </div>
    </div>
  );
}
