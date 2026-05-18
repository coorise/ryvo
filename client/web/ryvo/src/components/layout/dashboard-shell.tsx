"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
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

  const visibleNav = nav.filter((item) => {
    if (!user) return false;
    if (item.roles?.length && !hasRole(user, ...item.roles)) return false;
    if (item.permissions?.length && !item.permissions.some((p) => hasPermission(user, p))) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="border-border from-background to-muted/30 hidden w-64 flex-col border-r bg-gradient-to-b md:flex">
        <div className="border-border border-b px-5 py-5">
          <BrandLogo subtitle={`${area} console`} href={ROUTES[area].home} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <div className="border-border border-t p-3">
          <RyvoButton
            intent="danger"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut().then(() => router.push(ROUTES.landing))}
          >
            <LogOut className="size-4" /> Sign out
          </RyvoButton>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex items-center justify-between border-b px-4 py-4 md:px-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
