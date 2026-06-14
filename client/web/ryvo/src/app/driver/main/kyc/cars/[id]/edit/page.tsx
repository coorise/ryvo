"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PortalVehicleForm } from "@/components/portal/vehicle/portal-vehicle-form";
import { PortalPageShell } from "@/components/portal/portal-page-shell";

export default function CarEditPage() {
  const { t } = useTranslation();
  const params = useParams();
  const vehicleId = String(params.id ?? "");

  return (
    <PortalPageShell title={t("portal.kyc.editCar")} subtitle={t("portal.kyc.editCarSubtitle")}>
      <Link
        href={`/driver/main/kyc/cars/${vehicleId}`}
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← {t("portal.kyc.viewCar")}
      </Link>
      <PortalVehicleForm mode="edit" vehicleId={vehicleId} />
    </PortalPageShell>
  );
}
