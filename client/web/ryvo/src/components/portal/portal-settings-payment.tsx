"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PORTAL_ROUTES } from "@/configs/portal-nav";

export function PortalSettingsPaymentPanel({ area }: { area: "driver" | "client" }) {
  const { t } = useTranslation();
  const payments =
    area === "driver" ? PORTAL_ROUTES.driver.payments : PORTAL_ROUTES.client.payments;

  return (
    <Card className="border-border/80 rounded-3xl">
      <CardHeader>
        <CardTitle>{t("portal.settings.tabs.payment")}</CardTitle>
        <CardDescription>{t("portal.settings.paymentHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RyvoButton intent="outline" asChild>
          <Link href={payments}>{t("portal.nav.payments")}</Link>
        </RyvoButton>
      </CardContent>
    </Card>
  );
}
