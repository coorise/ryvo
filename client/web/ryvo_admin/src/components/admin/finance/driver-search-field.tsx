"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { rbacService, type AdminUserRow } from "@/services/rbac.service";

export type DriverPick = {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
};

type DriverSearchFieldProps = {
  value: DriverPick | null;
  onChange: (driver: DriverPick | null) => void;
  label?: string;
  disabled?: boolean;
};

function toPick(u: AdminUserRow): DriverPick {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    username: u.username,
  };
}

function driverLabel(d: DriverPick) {
  const name = d.full_name?.trim();
  const handle = d.username ? `@${d.username}` : null;
  if (name && handle) return `${name} (${handle}) · ${d.email}`;
  if (name) return `${name} · ${d.email}`;
  if (handle) return `${handle} · ${d.email}`;
  return d.email;
}

export function DriverSearchField({ value, onChange, label, disabled }: DriverSearchFieldProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [query, setQuery] = useState(value ? driverLabel(value) : "");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "drivers", "search"],
    queryFn: () => rbacService.listUsers(accessToken, "drivers"),
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  });

  const drivers = data?.users ?? [];

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers.slice(0, 8).map(toPick);
    return drivers
      .filter((d) => {
        const hay = [d.email, d.full_name ?? "", d.username ?? "", d.id].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8)
      .map(toPick);
  }, [drivers, query]);

  function select(driver: DriverPick) {
    onChange(driver);
    setQuery(driverLabel(driver));
    setOpen(false);
  }

  function onInputChange(v: string) {
    setQuery(v);
    setOpen(true);
    if (!v.trim()) onChange(null);
    else if (value && v !== driverLabel(value)) onChange(null);
  }

  return (
    <div className="space-y-1">
      <Label>{label ?? t("financePaychecks.searchDriver")}</Label>
      <div className="relative">
        <Input
          disabled={disabled}
          value={query}
          placeholder={t("financePaychecks.searchDriverPlaceholder")}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          autoComplete="off"
        />
        {open && !disabled && (
          <ul
            className="border-border bg-popover absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border py-1 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {isLoading && (
              <li className="text-muted-foreground px-3 py-2 text-sm">{t("common.loading")}</li>
            )}
            {!isLoading && !suggestions.length && (
              <li className="text-muted-foreground px-3 py-2 text-sm">{t("financePaychecks.noDriverMatch")}</li>
            )}
            {suggestions.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-muted w-full px-3 py-2 text-left text-sm",
                    value?.id === d.id && "bg-muted",
                  )}
                  onClick={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    select(d);
                  }}
                >
                  <span className="font-medium">{d.full_name ?? d.username ?? d.email}</span>
                  <span className="text-muted-foreground block text-xs">
                    {[d.username ? `@${d.username}` : null, d.email].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
