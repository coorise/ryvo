"use client";

import { useTranslation } from "react-i18next";

import { PortalPlaceholder } from "@/components/portal/portal-placeholder";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";

/** User-scoped preferences (General / Payment / Notifications) — not platform admin settings. */
export function PortalConfigurationsTabs() {
  const { t } = useTranslation();

  return (
    <PortalTabShell
      defaultTab="general"
      tabs={[
        {
          id: "general",
          label: t("portal.settings.tabs.general"),
          content: (
            <PortalPlaceholder
              title={t("portal.settings.tabs.general")}
              description={t("portal.settings.generalHint")}
            />
          ),
        },
        {
          id: "payment",
          label: t("portal.settings.tabs.payment"),
          content: (
            <PortalPlaceholder
              title={t("portal.settings.tabs.payment")}
              description={t("portal.settings.paymentHint")}
            />
          ),
        },
        {
          id: "notifications",
          label: t("portal.settings.tabs.notifications"),
          content: (
            <PortalPlaceholder
              title={t("portal.settings.tabs.notifications")}
              description={t("portal.settings.notificationsHint")}
            />
          ),
        },
      ]}
    />
  );
}
