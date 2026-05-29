"use client";

import { ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import { dashboardPathForUser } from "@/guards/abac";
import { useAuth } from "@/hooks/use-auth";

export function LandingHeroActions() {
  const { t } = useTranslation();
  const { user, isReady } = useAuth();
  const loggedIn = isReady && Boolean(user);
  const dashboardHref = loggedIn ? dashboardPathForUser(user) : ROUTES.auth.login;

  if (loggedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <RyvoButton intent="cta" size="lg" className="rounded-full" asChild>
          <Link href={dashboardHref}>
            <LayoutDashboard className="size-5" />
            {t("landing.goToDashboard")}
            <ArrowRight className="size-4" />
          </Link>
        </RyvoButton>
        <RyvoButton intent="outline" size="lg" className="rounded-full" asChild>
          <Link href={ROUTES.landing}>{t("landing.goHome")}</Link>
        </RyvoButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <RyvoButton intent="cta" size="lg" className="rounded-full" asChild>
        <Link href={ROUTES.auth.login}>
          {t("landing.staffSignIn")}
          <ArrowRight className="size-4" />
        </Link>
      </RyvoButton>
    </div>
  );
}
