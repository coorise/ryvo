"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_OVERVIEW, type AdminNavItemConfig } from "@/configs/admin-nav";
import { canSeeAdminNavItem } from "@/guards/admin-access";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SearchResult = {
  href: string;
  label: string;
  groupLabel: string;
  icon: AdminNavItemConfig["icon"];
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function AdminGlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const allResults = useMemo<SearchResult[]>(() => {
    if (!user) return [];
    const canSee = (item: AdminNavItemConfig) => canSeeAdminNavItem(user, item);

    const items: SearchResult[] = [];
    items.push({
      href: ADMIN_NAV_OVERVIEW.href,
      label: t(ADMIN_NAV_OVERVIEW.labelKey),
      groupLabel: t("nav.overview"),
      icon: ADMIN_NAV_OVERVIEW.icon,
    });

    for (const group of ADMIN_NAV_GROUPS) {
      const groupLabel = t(group.labelKey);
      for (const item of group.items) {
        if (!canSee(item)) continue;
        items.push({
          href: item.href,
          label: t(item.labelKey),
          groupLabel,
          icon: item.icon,
        });
      }
    }

    // Deduplicate by href (keep first)
    const seen = new Set<string>();
    return items.filter((it) => (seen.has(it.href) ? false : (seen.add(it.href), true)));
  }, [user, t]);

  const results = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return [];
    return allResults
      .map((r) => {
        const score =
          normalize(r.label) === nq ? 100 : normalize(r.label).startsWith(nq) ? 50 : normalize(r.label).includes(nq) ? 10 : 0;
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.r.label.localeCompare(b.r.label))
      .slice(0, 12)
      .map((x) => x.r);
  }, [allResults, q]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={rootRef} className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const hit = results[activeIdx];
            if (hit) go(hit.href);
          }
        }}
        className="rounded-full pl-9"
        placeholder={t("common.search")}
      />

      {open && results.length > 0 && (
        <div className="border-border bg-card absolute top-11 left-0 z-50 w-full overflow-hidden rounded-2xl border shadow-xl">
          <div className="max-h-80 overflow-y-auto p-1">
            {results.map((r, idx) => {
              const Icon = r.icon;
              const active = idx === activeIdx;
              return (
                <button
                  key={r.href}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => go(r.href)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
                    active ? "bg-muted" : "hover:bg-muted",
                  )}
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.label}</div>
                    <div className="text-muted-foreground truncate text-[11px]">{r.groupLabel}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

