"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { PortalVehicleForm } from "@/components/portal/vehicle/portal-vehicle-form";
import { PortalPageShell } from "@/components/portal/portal-page-shell";

export default function NewCarPage() {
  const { t } = useTranslation();

  return (
    <PortalPageShell title={t("portal.kyc.addCar")} subtitle={t("portal.kyc.addCarSubtitle")}>
      <Link
        href="/driver/main/kyc?tab=cars"
        className="text-muted-foreground mb-4 inline-block text-sm hover:underline"
      >
        ← {t("portal.kyc.backToCars")}
      </Link>
      <PortalVehicleForm mode="create" />
    </PortalPageShell>
  );
}
