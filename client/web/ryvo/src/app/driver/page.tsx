"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Car, Map, Users } from "lucide-react";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PORTAL_ROUTES } from "@/configs/portal-nav";

export default function DriverHomePage() {
  const { t } = useTranslation();

  const cards = [
    {
      title: t("portal.home.driver.liveMapTitle"),
      description: t("portal.home.driver.liveMapDesc"),
      href: PORTAL_ROUTES.driver.liveMap,
      icon: Map,
    },
    {
      title: t("portal.nav.rides"),
      description: t("portal.rides.subtitle"),
      href: PORTAL_ROUTES.driver.rides,
      icon: Car,
    },
    {
      title: t("portal.nav.clients"),
      description: t("portal.clients.subtitle"),
      href: PORTAL_ROUTES.driver.clients,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("portal.nav.overview")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("portal.home.driver.subtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.href} className="border-border/80 rounded-3xl">
            <CardHeader>
              <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
                <card.icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <RyvoButton intent="cta" size="sm" asChild>
                <Link href={card.href}>{t("portal.home.open")}</Link>
              </RyvoButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
