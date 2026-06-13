"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AdminSidebarBrand } from "@/components/layout/admin-sidebar-brand";
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { LogOut } from "lucide-react";

type AdminSidebarContentProps = {
  hasPermission: (p: string) => boolean;
  hasPermPrefix: (p: string) => boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  footer?: ReactNode;
};

/** Shared admin sidebar body (desktop aside + mobile drawer). */
export function AdminSidebarContent({
  hasPermission,
  hasPermPrefix,
  onNavigate,
  onSignOut,
  footer,
}: AdminSidebarContentProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border shrink-0 border-b px-5 py-5">
        <AdminSidebarBrand onNavigate={onNavigate} />
      </div>
      <AdminSidebarNav
        hasPermission={hasPermission}
        hasPermPrefix={hasPermPrefix}
        onNavigate={onNavigate}
      />
      <div className="border-border mt-auto shrink-0 border-t p-3">
        {footer ?? (
          <RyvoButton
            intent="danger"
            variant="ghost"
            className="w-full justify-start"
            onClick={onSignOut}
          >
            <LogOut className="size-4" /> {t("common.signOut")}
          </RyvoButton>
        )}
      </div>
    </div>
  );
}
