"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Search, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { UI } from "@/configs/const";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const iconTone = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-primary/15 text-primary",
    warning: "bg-amber-500/15 text-amber-700",
    danger: "bg-destructive/15 text-destructive",
    info: "bg-sky-500/15 text-sky-800",
  }[tone];

  return (
    <div
      className={cn(
        "border-border bg-card flex items-start gap-4 border p-5 shadow-sm",
        UI.statCardRadius,
      )}
    >
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconTone)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">{label}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
    </div>
  );
}

export function AdminSearchToolbar({
  value,
  onChange,
  placeholder,
  filters,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  filters?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
        <Input
          className={cn("border-border bg-card h-12 rounded-full pl-11 shadow-sm", UI.tableCardRadius)}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}
    </div>
  );
}

export function AdminFilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      className={cn(
        "border-border bg-card h-12 min-w-[140px] rounded-full border px-4 text-sm shadow-sm",
        className,
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AdminTableCard({
  children,
  empty,
  isEmpty,
}: {
  children: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className={cn("border-border bg-card overflow-hidden border shadow-sm", UI.tableCardRadius)}>
      {isEmpty ? empty : children}
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/40 text-muted-foreground border-border border-b text-left text-[11px] font-bold tracking-wider uppercase">
      {children}
    </thead>
  );
}

/** Vertical stack with consistent spacing between list blocks (stats, search, table). */
export function AdminListStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

export function SortableTableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  activeSort: { key: string; dir: "asc" | "desc" } | null;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = activeSort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : activeSort?.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className={cn("px-5 py-3.5", className)}>
      <button
        type="button"
        className="hover:text-foreground inline-flex items-center gap-1 transition"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className="size-3.5 opacity-70" />
      </button>
    </th>
  );
}

export function EntityGridCard({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "border-border bg-card hover:border-primary/40 w-full rounded-2xl border p-4 text-left shadow-sm transition",
        onClick && "cursor-pointer hover:shadow-md",
      )}
    >
      {children}
    </Tag>
  );
}

export function EntityGrid({
  children,
  empty,
  isEmpty,
}: {
  children: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return <>{empty}</>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
  );
}

export function UserTableCell({
  name,
  subId,
  email,
}: {
  name: string;
  subId?: string;
  email?: string;
}) {
  const initial = (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="bg-primary/15 text-primary flex shrink-0 items-center justify-center rounded-full font-bold"
        style={{ width: UI.tableRowAvatarSize, height: UI.tableRowAvatarSize }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        {subId && <p className="text-muted-foreground truncate text-xs">{subId}</p>}
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-primary/15 text-primary",
    warning: "bg-amber-500/15 text-amber-800",
    danger: "bg-destructive/15 text-destructive",
    info: "bg-sky-500/15 text-sky-800",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
}

export function InlineRowActions({
  onView,
  onEdit,
  onToggle,
  toggleSuspended,
}: {
  onView: () => void;
  onEdit?: () => void;
  onToggle?: () => void;
  toggleSuspended?: boolean;
}) {
  const { t } = useTranslation();
  const btn =
    "hover:border-primary hover:bg-primary/5 flex size-9 items-center justify-center rounded-full border border-border bg-background transition";

  return (
    <div className="flex justify-end gap-1.5">
      <button type="button" className={btn} onClick={onView} aria-label={t("actions.view")}>
        <Eye className="size-4" />
      </button>
      {onEdit && (
        <button type="button" className={btn} onClick={onEdit} aria-label={t("actions.edit")}>
          <Pencil className="size-4" />
        </button>
      )}
      {onToggle && (
        <button
          type="button"
          className={cn(btn, toggleSuspended && "border-destructive/40 text-destructive")}
          onClick={onToggle}
          aria-label={t("actions.update")}
        >
          <UserRound className="size-4" />
        </button>
      )}
    </div>
  );
}

export function shortUserId(id: string) {
  return `U-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
