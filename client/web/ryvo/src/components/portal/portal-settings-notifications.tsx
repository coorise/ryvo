"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PORTAL_ROUTES } from "@/configs/portal-nav";

export function PortalSettingsNotificationsPanel({ area }: { area: "driver" | "client" }) {
  const { t } = useTranslation();
  const inbox =
    area === "driver"
      ? PORTAL_ROUTES.driver.notifications
      : PORTAL_ROUTES.client.notifications;

  return (
    <Card className="border-border/80 rounded-3xl">
      <CardHeader>
        <CardTitle>{t("portal.settings.tabs.notifications")}</CardTitle>
        <CardDescription>{t("portal.settings.notificationsHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RyvoButton intent="outline" asChild>
          <Link href={inbox}>{t("portal.settings.openInbox")}</Link>
        </RyvoButton>
      </CardContent>
    </Card>
  );
}
