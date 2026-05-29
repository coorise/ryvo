"use client";

import { useTranslation } from "react-i18next";

import { PortalSettingsGeneralPanel } from "@/components/portal/portal-settings-general";
import { PortalSettingsNotificationsPanel } from "@/components/portal/portal-settings-notifications";
import { PortalSettingsPaymentPanel } from "@/components/portal/portal-settings-payment";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";
import type { PortalArea } from "@/configs/portal-nav";

type PortalConfigurationsTabsProps = {
  area: PortalArea;
};

export function PortalConfigurationsTabs({ area }: PortalConfigurationsTabsProps) {
  const { t } = useTranslation();

  return (
    <PortalTabShell
      defaultTab="general"
      tabs={[
        {
          id: "general",
          label: t("portal.settings.tabs.general"),
          content: <PortalSettingsGeneralPanel />,
        },
        {
          id: "payment",
          label: t("portal.settings.tabs.payment"),
          content: <PortalSettingsPaymentPanel area={area} />,
        },
        {
          id: "notifications",
          label: t("portal.settings.tabs.notifications"),
          content: <PortalSettingsNotificationsPanel area={area} />,
        },
      ]}
    />
  );
}
