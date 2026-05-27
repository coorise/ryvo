"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROUTES } from "@/configs";
import { hasPermission, hasRole } from "@/guards/abac";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  roles?: readonly string[];
  permissions?: readonly string[];
};

type DashboardShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  nav: NavItem[];
  area: "client" | "driver" | "admin";
};

export function DashboardShell({ children, title, subtitle, nav, area }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);

  const visibleNav = nav.filter((item) => {
    if (!user) return false;
    if (item.roles?.length && !hasRole(user, ...item.roles)) return false;
    if (item.permissions?.length && !item.permissions.some((p) => hasPermission(user, p))) {
      return false;
    }
    return true;
  });

  const closeNav = () => setNavOpen(false);

  const handleSignOut = () => {
    closeNav();
    void signOut().then(() => router.push(ROUTES.landing));
  };

  const navBody = (
    <>
      <div className="border-border shrink-0 border-b px-5 py-5">
        <BrandLogo subtitle={`${area} console`} href={ROUTES[area].home} onNavigate={closeNav} />
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeNav}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-border mt-auto shrink-0 border-t p-3">
        <RyvoButton
          intent="danger"
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" /> {t("common.signOut")}
        </RyvoButton>
      </div>
    </>
  );

  return (
    <div className="bg-background text-foreground flex h-svh overflow-hidden">
      <aside className="border-border from-background to-muted/30 hidden h-svh w-64 shrink-0 flex-col border-r bg-gradient-to-b md:flex">
        {navBody}
      </aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[min(100vw-2rem,18rem)] gap-0 p-0 sm:max-w-xs"
        >
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <div className="flex h-full min-h-0 flex-col">{navBody}</div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border flex shrink-0 items-center gap-3 border-b px-3 py-3 sm:px-4 md:px-6">
          <button
            type="button"
            aria-label={t("nav.openMenu")}
            onClick={() => setNavOpen(true)}
            className="hover:border-primary flex size-10 shrink-0 items-center justify-center rounded-full border border-border md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg md:text-xl">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground truncate text-xs sm:text-sm">{subtitle}</p>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
