"use client";

import { Bell, LogOut, Moon, Search, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs/const";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useRbac } from "@/hooks/use-rbac";
import { Input } from "@/components/ui/input";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { hasPermission, hasPermPrefix } = useRbac();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { data: dashboard } = useAdminDashboard();
  const dark = theme === "dark";
  const { data: notifications } = useNotifications();

  return (
    <div className="bg-muted/30 text-foreground flex h-svh overflow-hidden">
      <aside className="border-border bg-card hidden h-svh w-64 shrink-0 flex-col border-r md:flex">
        <div className="border-border border-b px-5 py-5">
          <BrandLogo subtitle="Admin console" href={ROUTES.admin.home} />
        </div>
        <AdminSidebarNav hasPermission={hasPermission} hasPermPrefix={hasPermPrefix} />
        <div className="border-border border-t p-3">
          <RyvoButton
            intent="danger"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut().then(() => router.push(ROUTES.landing))}
          >
            <LogOut className="size-4" /> {t("common.signOut")}
          </RyvoButton>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-border bg-background/80 sticky top-0 z-30 flex shrink-0 items-center gap-4 border-b px-4 py-3 backdrop-blur-md md:px-8">
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input className="rounded-full pl-9" placeholder={t("common.search")} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher compact />
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(dark ? "light" : "dark")}
              className="hover:border-primary flex size-9 items-center justify-center rounded-full border border-border"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                className="hover:border-primary flex size-9 items-center justify-center rounded-full border border-border"
                aria-label="Notifications"
                onClick={() => {
                  const el = document.getElementById("admin-notifications-panel");
                  el?.classList.toggle("hidden");
                }}
              >
                <Bell className="size-4" />
                {((notifications?.notifications?.filter((n) => !n.read_at).length ?? 0) +
                  (dashboard?.badges.tickets ?? 0)) > 0 && (
                  <span className="bg-destructive absolute top-1 right-1 size-2 rounded-full" />
                )}
              </button>
              <div
                id="admin-notifications-panel"
                className="border-border bg-card absolute top-11 right-0 z-50 hidden max-h-80 w-80 overflow-y-auto rounded-2xl border p-2 shadow-xl"
              >
                {(notifications?.notifications ?? []).slice(0, 12).map((n) => (
                  <div key={n.id} className="border-border border-b px-3 py-2 text-xs last:border-0">
                    <p className="font-semibold">{n.type}</p>
                    <p className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!notifications?.notifications?.length && (
                  <p className="text-muted-foreground px-3 py-4 text-center text-xs">No notifications</p>
                )}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-bold">
                {user?.email?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="text-sm leading-tight">
                <p className="font-semibold">Admin</p>
                <p className="text-muted-foreground max-w-[140px] truncate text-xs">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
