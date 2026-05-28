"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type PortalArea,
  type PortalNavGroupId,
  portalNavForArea,
  portalNavGroupsForPath,
} from "@/configs/portal-nav";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "ryvo.portal.nav.expanded.";

function isNavActive(pathname: string, href: string) {
  if (href === "/client" || href === "/driver") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function defaultExpanded(area: PortalArea): Record<PortalNavGroupId, boolean> {
  const config = portalNavForArea(area);
  const state = {} as Record<PortalNavGroupId, boolean>;
  for (const g of config.groups) state[g.id] = g.defaultExpanded;
  return state;
}

type PortalSidebarNavProps = {
  area: PortalArea;
  onNavigate?: () => void;
};

export function PortalSidebarNav({ area, onNavigate }: PortalSidebarNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const config = portalNavForArea(area);
  const storageKey = `${STORAGE_PREFIX}${area}`;

  const [expanded, setExpanded] = useState<Record<PortalNavGroupId, boolean>>(() =>
    defaultExpanded(area),
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setExpanded({ ...defaultExpanded(area), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, [area, storageKey]);

  useEffect(() => {
    const activeGroups = portalNavGroupsForPath(pathname, config);
    if (activeGroups.size === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      activeGroups.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [pathname, config]);

  const persistExpanded = useCallback(
    (next: Record<PortalNavGroupId, boolean>) => {
      setExpanded(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const toggleGroup = (id: PortalNavGroupId) => {
    persistExpanded({ ...expanded, [id]: !expanded[id] });
  };

  const overviewActive = isNavActive(pathname, config.overview.href);
  const OverviewIcon = config.overview.icon;

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <div className="mb-3">
        <p className="text-muted-foreground mb-2 px-3 text-[10px] font-bold tracking-[0.15em] uppercase">
          {t("portal.nav.overview")}
        </p>
        <Link
          href={config.overview.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
            overviewActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <OverviewIcon className="size-4 shrink-0" />
          <span className="truncate">{t(config.overview.labelKey)}</span>
        </Link>
      </div>

      {config.groups.map((group) => {
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
            {isOpen && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-xl py-2.5 pr-3 pl-9 text-sm font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
