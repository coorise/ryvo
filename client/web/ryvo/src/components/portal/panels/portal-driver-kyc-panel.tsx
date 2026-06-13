"use client";

import { useTranslation } from "react-i18next";

import { PortalKycCarsTab } from "@/components/portal/panels/portal-kyc-cars-tab";
import { PortalKycYouTab } from "@/components/portal/panels/portal-kyc-you-tab";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";

export function PortalDriverKycPanel() {
  const { t } = useTranslation();

  return (
    <PortalTabShell
      defaultTab="you"
      tabs={[
        { id: "you", label: t("portal.kyc.tabs.you"), content: <PortalKycYouTab /> },
        { id: "cars", label: t("portal.kyc.tabs.cars"), content: <PortalKycCarsTab /> },
      ]}
    />
  );
}
