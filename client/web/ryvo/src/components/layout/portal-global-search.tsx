"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import {
  type PortalArea,
  type PortalNavItemConfig,
  portalNavForArea,
} from "@/configs/portal-nav";
import { canSeePortalNavItem } from "@/guards/portal-access";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SearchResult = {
  href: string;
  label: string;
  groupLabel: string;
  icon: PortalNavItemConfig["icon"];
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

type PortalGlobalSearchProps = {
  area: PortalArea;
};

export function PortalGlobalSearch({ area }: PortalGlobalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const config = portalNavForArea(area);

  const allResults = useMemo<SearchResult[]>(() => {
    if (!user) return [];
    const items: SearchResult[] = [];
    if (canSeePortalNavItem(user, config.overview)) {
      items.push({
        href: config.overview.href,
        label: t(config.overview.labelKey),
        groupLabel: t("portal.nav.overview"),
        icon: config.overview.icon,
      });
    }
    for (const group of config.groups) {
      const groupLabel = t(group.labelKey);
      for (const item of group.items) {
        if (!canSeePortalNavItem(user, item)) continue;
        items.push({
          href: item.href,
          label: t(item.labelKey),
          groupLabel,
          icon: item.icon,
        });
      }
    }
    return items;
  }, [config, t, user]);

  const results = useMemo(() => {
    const needle = normalize(q);
    if (!needle) return allResults.slice(0, 8);
    return allResults
      .filter(
        (r) =>
          normalize(r.label).includes(needle) ||
          normalize(r.groupLabel).includes(needle) ||
          normalize(r.href).includes(needle),
      )
      .slice(0, 12);
  }, [allResults, q]);

  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [pathname]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div ref={rootRef} className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, results.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === "Enter" && results[activeIdx]) {
              e.preventDefault();
              go(results[activeIdx].href);
            }
          }}
          placeholder={t("common.search")}
          className="h-10 rounded-full pl-9"
          aria-label={t("common.search")}
          aria-expanded={open}
          role="combobox"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          className="border-border bg-card absolute top-11 z-50 max-h-80 w-full overflow-y-auto rounded-2xl border p-1 shadow-xl"
          role="listbox"
        >
          {results.map((r, idx) => {
            const Icon = r.icon;
            return (
              <li key={r.href}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={cn(
                    "hover:bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    idx === activeIdx && "bg-muted",
                  )}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => go(r.href)}
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.label}</span>
                    <span className="text-muted-foreground block truncate text-xs">{r.groupLabel}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
