"use client";

import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PortalSidebarBrand } from "@/components/layout/portal-sidebar-brand";
import { PortalSidebarNav } from "@/components/layout/portal-sidebar-nav";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import type { PortalArea } from "@/configs/portal-nav";

type PortalSidebarContentProps = {
  area: PortalArea;
  onNavigate?: () => void;
  onSignOut: () => void;
};

/** Shared portal sidebar body (desktop aside + mobile drawer). */
export function PortalSidebarContent({ area, onNavigate, onSignOut }: PortalSidebarContentProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border shrink-0 border-b px-5 py-5">
        <PortalSidebarBrand area={area} onNavigate={onNavigate} />
      </div>
      <PortalSidebarNav area={area} onNavigate={onNavigate} />
      <div className="border-border mt-auto shrink-0 border-t p-3">
        <RyvoButton
          intent="danger"
          variant="ghost"
          className="w-full justify-start"
          onClick={onSignOut}
        >
          <LogOut className="size-4" /> {t("common.signOut")}
        </RyvoButton>
      </div>
    </div>
  );
}
