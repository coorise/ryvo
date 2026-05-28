"use client";

import { LayoutGrid, List, ScrollText, SquareStack } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AdminFilterSelect } from "@/components/admin/admin-list-ui";
import {
  LIST_DEFAULT_PAGE_SIZE,
  LIST_LOAD_MODE,
  LIST_LAYOUT,
  LIST_PAGE_SIZE,
  type ListLayout,
  type ListLoadMode,
} from "@/configs/const";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SortOption = { value: string; label: string };

type ListLayoutToolbarProps = {
  layout: ListLayout;
  onLayoutChange: (layout: ListLayout) => void;
  loadMode: ListLoadMode;
  onLoadModeChange: (mode: ListLoadMode) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  /** Shown in grid mode — column sort is in table headers */
  gridSortValue?: string;
  onGridSortValueChange?: (value: string) => void;
  sortOptions?: SortOption[];
  filters?: React.ReactNode;
};

export function ListLayoutToolbar({
  layout,
  onLayoutChange,
  loadMode,
  onLoadModeChange,
  pageSize,
  onPageSizeChange,
  gridSortValue,
  onGridSortValueChange,
  sortOptions,
  filters,
}: ListLayoutToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup ariaLabel={t("list.layoutTable")}>
            <TogglePill
              active={layout === LIST_LAYOUT.table}
              onClick={() => onLayoutChange(LIST_LAYOUT.table)}
              label={t("list.layoutTable")}
            >
              <List className="size-4" />
            </TogglePill>
            <TogglePill
              active={layout === LIST_LAYOUT.grid}
              onClick={() => onLayoutChange(LIST_LAYOUT.grid)}
              label={t("list.layoutGrid")}
            >
              <LayoutGrid className="size-4" />
            </TogglePill>
          </ToggleGroup>

          <ToggleGroup ariaLabel={t("list.loadModeLabel")}>
            <TogglePill
              active={loadMode === LIST_LOAD_MODE.infinite}
              onClick={() => onLoadModeChange(LIST_LOAD_MODE.infinite)}
              label={t("list.loadInfinite")}
            >
              <ScrollText className="size-4" />
            </TogglePill>
            <TogglePill
              active={loadMode === LIST_LOAD_MODE.pages}
              onClick={() => onLoadModeChange(LIST_LOAD_MODE.pages)}
              label={t("list.loadPages")}
            >
              <SquareStack className="size-4" />
            </TogglePill>
          </ToggleGroup>

          <label className="border-border bg-card flex h-10 items-center gap-2 rounded-full border px-3 shadow-sm">
            <span className="text-muted-foreground text-xs font-semibold whitespace-nowrap">
              {t("list.pageSize")}
            </span>
            <Input
              type="number"
              min={LIST_PAGE_SIZE.min}
              max={LIST_PAGE_SIZE.max}
              className="h-7 w-16 border-0 bg-transparent p-0 text-center text-sm shadow-none"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) || LIST_DEFAULT_PAGE_SIZE)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {layout === LIST_LAYOUT.grid && sortOptions && onGridSortValueChange && gridSortValue != null && (
            <AdminFilterSelect
              value={gridSortValue}
              onChange={onGridSortValueChange}
              options={sortOptions}
              className="min-w-[180px]"
            />
          )}
          {filters}
        </div>
      </div>
    </div>
  );
}

function ToggleGroup({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="border-border bg-muted/50 inline-flex rounded-full border p-1"
    >
      {children}
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
