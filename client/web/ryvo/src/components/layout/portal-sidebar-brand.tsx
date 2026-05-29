"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { ROUTES } from "@/configs/const";
import type { PortalArea } from "@/configs/portal-nav";
import { cn } from "@/lib/utils";

type PortalSidebarBrandProps = {
  area: PortalArea;
  onNavigate?: () => void;
  className?: string;
};

export function PortalSidebarBrand({ area, onNavigate, className }: PortalSidebarBrandProps) {
  const { t } = useTranslation();
  const homeHref = area === "driver" ? ROUTES.driver.home : ROUTES.client.home;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandLogo
        subtitle={`${area} console`}
        href={ROUTES.landing}
        onNavigate={onNavigate}
        className="min-w-0 flex-1"
      />
      <Link
        href={homeHref}
        onClick={onNavigate}
        title={t("nav.dashboard")}
        aria-label={t("nav.dashboard")}
        className="hover:border-primary text-muted-foreground hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border border-border transition"
      >
        <Home className="size-4" />
      </Link>
    </div>
  );
}
