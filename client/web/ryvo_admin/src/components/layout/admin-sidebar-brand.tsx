"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { ROUTES } from "@/configs/const";
import { cn } from "@/lib/utils";

type AdminSidebarBrandProps = {
  onNavigate?: () => void;
  className?: string;
};

/** Logo → marketing landing; home icon → admin dashboard. */
export function AdminSidebarBrand({ onNavigate, className }: AdminSidebarBrandProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandLogo
        subtitle="Admin console"
        href={ROUTES.landing}
        onNavigate={onNavigate}
        className="min-w-0 flex-1"
      />
      <Link
        href={ROUTES.admin.home}
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
