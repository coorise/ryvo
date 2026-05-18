"use client";

import {
  Bell,
  Car,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs/const";
import { canViewStaffSection } from "@/guards/abac";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useRbac } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavEntry = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeLive?: boolean;
  /** Any of these permission prefixes grants visibility (e.g. "users:") */
  permPrefixes?: readonly string[];
  /** Exact permission required if no prefix match */
  permissions?: readonly string[];
};

const NAV_SECTIONS: { titleKey: string; items: NavEntry[] }[] = [
  {
    titleKey: "nav.operations",
    items: [
      {
        href: "/admin",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        permPrefixes: ["rides:", "users:", "drivers:", "staff:", "roles:", "audit:", "settings:"],
      },
      {
        href: "/admin/map",
        labelKey: "nav.liveMap",
        icon: Map,
        badgeLive: true,
        permPrefixes: ["rides:"],
      },
      {
        href: "/admin/rides",
        labelKey: "nav.rides",
        icon: Car,
        badge: "rides",
        permPrefixes: ["rides:"],
      },
      {
        href: ROUTES.admin.users.list,
        labelKey: "nav.users",
        icon: Users,
        permPrefixes: ["users:"],
      },
      {
        href: ROUTES.admin.staff.list,
        labelKey: "nav.staff",
        icon: UserCog,
        permPrefixes: ["staff:", "roles:"],
      },
      {
        href: ROUTES.admin.drivers.list,
        labelKey: "nav.driverKyc",
        icon: UserCheck,
        badge: "drivers",
        permPrefixes: ["drivers:"],
      },
      {
        href: "/admin/tickets",
        labelKey: "nav.support",
        icon: MessageSquare,
        badge: "tickets",
        permPrefixes: ["support:"],
      },
      {
        href: "/admin/settings",
        labelKey: "common.settings",
        icon: Settings,
        permPrefixes: ["settings:"],
      },
    ],
  },
  {
    titleKey: "nav.financeSecurity",
    items: [
      {
        href: "/admin/payments",
        labelKey: "nav.payments",
        icon: CreditCard,
        permPrefixes: ["payments:"],
      },
      {
        href: "/admin/security",
        labelKey: "nav.security",
        icon: Shield,
        permPrefixes: ["audit:"],
      },
      {
        href: "/admin/audit",
        labelKey: "nav.audit",
        icon: FileText,
        permPrefixes: ["audit:"],
      },
    ],
  },
];

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { hasPermission, hasPermPrefix } = useRbac();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { data: dashboard } = useAdminDashboard();
  const dark = theme === "dark";

  function badgeFor(item: NavEntry): string | undefined {
    if (item.badgeLive) return "Live";
    if (!item.badge || !dashboard?.badges) return undefined;
    const n = dashboard.badges[item.badge as keyof typeof dashboard.badges];
    return n > 0 ? String(n) : undefined;
  }

  const { data: notifications } = useNotifications();

  function canSeeItem(item: NavEntry) {
    if (!user) return false;
    if (item.href === "/admin/staff" && !canViewStaffSection(user)) return false;
    if (user.roles.includes("super_admin")) return true;
    if (item.permissions?.some((p) => hasPermission(p))) return true;
    if (item.permPrefixes?.some((p) => hasPermPrefix(p))) return true;
    return false;
  }

  return (
    <div className="bg-muted/30 text-foreground flex h-svh overflow-hidden">
      <aside className="border-border bg-card hidden h-svh w-64 shrink-0 flex-col border-r md:flex">
        <div className="border-border border-b px-5 py-5">
          <BrandLogo subtitle="Admin console" href={ROUTES.admin.home} />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter(canSeeItem);
            if (!items.length) return null;
            return (
              <div key={section.titleKey}>
                <p className="text-muted-foreground mb-2 px-3 text-[10px] font-bold tracking-[0.15em] uppercase">
                  {t(section.titleKey)}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const Icon = item.icon;
                    const badge = badgeFor(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {badge && (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                              badge === "Live"
                                ? "bg-primary/20 text-primary"
                                : active
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary text-primary-foreground",
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
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