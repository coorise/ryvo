"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PortalVehicleView } from "@/components/portal/vehicle/portal-vehicle-view";
import { PortalPageShell } from "@/components/portal/portal-page-shell";

export default function CarViewPage() {
  const { t } = useTranslation();
  const params = useParams();
  const vehicleId = String(params.id ?? "");

  return (
    <PortalPageShell title={t("portal.kyc.viewCar")} subtitle={t("portal.kyc.viewCarSubtitle")}>
      <Link
        href="/driver/main/kyc?tab=cars"
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← {t("portal.kyc.backToCars")}
      </Link>
      <PortalVehicleView vehicleId={vehicleId} />
    </PortalPageShell>
  );
}
