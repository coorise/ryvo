"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_GROUP_IDS,
  ADMIN_NAV_OVERVIEW,
  type AdminNavGroupId,
  type AdminNavItemConfig,
} from "@/configs/admin-nav";
import { adminNavGroupsForPath, canSeeAdminNavItem } from "@/guards/admin-access";
import { useAuth } from "@/hooks/use-auth";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ryvo.admin.nav.expanded.v1";

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function defaultExpandedState(): Record<AdminNavGroupId, boolean> {
  return {
    [ADMIN_NAV_GROUP_IDS.main]: true,
    [ADMIN_NAV_GROUP_IDS.hr]: false,
    [ADMIN_NAV_GROUP_IDS.finances]: false,
    [ADMIN_NAV_GROUP_IDS.audits]: false,
    [ADMIN_NAV_GROUP_IDS.advanced]: false,
  };
}

function loadExpanded(): Record<AdminNavGroupId, boolean> {
  if (typeof window === "undefined") return defaultExpandedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultExpandedState();
    return { ...defaultExpandedState(), ...JSON.parse(raw) };
  } catch {
    return defaultExpandedState();
  }
}

type AdminSidebarNavProps = {
  hasPermission: (p: string) => boolean;
  hasPermPrefix: (p: string) => boolean;
};

export function AdminSidebarNav({ hasPermission, hasPermPrefix }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: dashboard } = useAdminDashboard();
  const [expanded, setExpanded] = useState<Record<AdminNavGroupId, boolean>>(defaultExpandedState);

  useEffect(() => {
    setExpanded(loadExpanded());
  }, []);

  useEffect(() => {
    const activeGroups = adminNavGroupsForPath(pathname);
    if (activeGroups.size === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      activeGroups.forEach((id) => {
        next[id as AdminNavGroupId] = true;
      });
      return next;
    });
  }, [pathname]);

  const persistExpanded = useCallback((next: Record<AdminNavGroupId, boolean>) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleGroup = (id: AdminNavGroupId) => {
    persistExpanded({ ...expanded, [id]: !expanded[id] });
  };

  const canSee = useCallback(
    (item: AdminNavItemConfig) => {
      if (!user) return false;
      void hasPermission;
      void hasPermPrefix;
      return canSeeAdminNavItem(user, item);
    },
    [user, hasPermission, hasPermPrefix],
  );

  function badgeFor(item: AdminNavItemConfig): string | undefined {
    if (item.badgeLive) return "Live";
    if (!item.badge || !dashboard?.badges) return undefined;
    const n = dashboard.badges[item.badge];
    return n > 0 ? String(n) : undefined;
  }

  const visibleGroups = useMemo(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(canSee),
      })).filter((g) => g.items.length > 0),
    [canSee],
  );

  const showOverview = canSee(ADMIN_NAV_OVERVIEW);

  function renderItem(item: AdminNavItemConfig, indent = false) {
    const active = isNavActive(pathname, item.href);
    const Icon = item.icon;
    const badge = badgeFor(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition",
          indent ? "pl-9 pr-3" : "px-3",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
        <span className="flex-1 truncate">{t(item.labelKey)}</span>
        {badge && (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
              badge === "Live"
                ? active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/20 text-primary"
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
  }

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {showOverview && (
        <div className="mb-3">
          <p className="text-muted-foreground mb-2 px-3 text-[10px] font-bold tracking-[0.15em] uppercase">
            {t("nav.overview")}
          </p>
          {renderItem(ADMIN_NAV_OVERVIEW)}
        </div>
      )}

      {visibleGroups.map((group) => {
        const isOpen = expanded[group.id] ?? group.defaultExpanded;
        return (
          <div key={group.id} className="mb-2">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition"
            >
              {isOpen ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )}
              <span className="truncate text-left">{t(group.labelKey)}</span>
            </button>
            {isOpen && <div className="space-y-0.5">{group.items.map((item) => renderItem(item, true))}</div>}
          </div>
        );
      })}
    </nav>
  );
}
