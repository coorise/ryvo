"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  EntityGrid,
  EntityGridCard,
  InlineRowActions,
  SortableTableHeader,
  StatusBadge,
  UserTableCell,
} from "@/components/admin/admin-list-ui";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { LIST_LAYOUT, SORT_KEYS } from "@/configs/const";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type ReferralListStat = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export type ReferralListColumn<T> = {
  key: string;
  header: string;
  sortKey?: string;
  cell: (row: T) => ReactNode;
  gridPrimary?: (row: T) => { title: string; subtitle?: string };
};

type ReferralAdminListProps<T extends { id?: string; user_id?: string }> = {
  rows: T[];
  rowKey: (row: T) => string;
  columns: ReferralListColumn<T>[];
  stats: ReferralListStat[];
  searchPlaceholder: string;
  searchMatch: (row: T, q: string) => boolean;
  audienceLabel: string;
  audienceOptions: { value: string; label: string }[];
  audience: string;
  onAudienceChange: (v: string) => void;
  addLabel: string;
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  canEdit: boolean;
  emptyLabel: string;
};

export function ReferralAdminList<T extends { id?: string; user_id?: string }>({
  rows,
  rowKey,
  columns,
  stats,
  searchPlaceholder,
  searchMatch,
  audienceLabel,
  audienceOptions,
  audience,
  onAudienceChange,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  canEdit,
  emptyLabel,
}: ReferralAdminListProps<T>) {
  const { t } = useTranslation();
  const list = useListControls(SORT_KEYS.updatedAt);

  const filtered = useMemo(() => {
    let data = rows;
    if (list.search) {
      const q = list.search.toLowerCase();
      data = data.filter((r) => searchMatch(r, q));
    }
    const s = list.activeSort;
    if (s?.key) {
      data = [...data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[s.key];
        const bv = (b as Record<string, unknown>)[s.key];
        if (typeof av === "number" && typeof bv === "number") {
          return compareSortable(av, bv, s.dir);
        }
        return compareSortable(String(av ?? ""), String(bv ?? ""), s.dir);
      });
    }
    return data;
  }, [rows, list.search, list.activeSort, searchMatch]);

  const pagination = usePaginatedSlice(filtered, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, audience],
  });

  const gridSortOptions = columns
    .filter((c) => c.sortKey)
    .map((c) => ({
      value: `${c.sortKey}:desc`,
      label: c.header,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{audienceLabel}</span>
          <AdminFilterSelect value={audience} options={audienceOptions} onChange={onAudienceChange} />
        </div>
        {canEdit && addLabel ? (
          <RyvoButton intent="cta" onClick={onAdd}>
            {addLabel}
          </RyvoButton>
        ) : null}
      </div>

      <AdminStatGrid>
        {stats.map((s) => (
          <AdminStatCard key={s.label} {...s} />
        ))}
      </AdminStatGrid>

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={searchPlaceholder}
      />

      <ListLayoutToolbar
        layout={list.layout}
        onLayoutChange={list.setLayout}
        loadMode={list.loadMode}
        onLoadModeChange={list.setLoadMode}
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        gridSortValue={list.gridSortValue}
        onGridSortValueChange={list.setGridSortValue}
        sortOptions={gridSortOptions}
      />

      {list.layout === LIST_LAYOUT.table ? (
        <AdminTableCard>
          <AdminTable>
            <AdminTableHead>
              <tr>
                {columns.map((col) =>
                  col.sortKey ? (
                    <SortableTableHeader
                      key={col.key}
                      label={col.header}
                      sortKey={col.sortKey}
                      activeSort={list.sort}
                      onSort={list.toggleColumnSort}
                    />
                  ) : (
                    <th key={col.key} className="text-muted-foreground px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase">
                      {col.header}
                    </th>
                  ),
                )}
                {canEdit && (
                  <th className="text-muted-foreground px-4 py-3 text-right text-[11px] font-bold tracking-wider uppercase">
                    {t("users.actions")}
                  </th>
                )}
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((row) => (
                <tr key={rowKey(row)} className="border-border/60 border-t">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.cell(row)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <InlineRowActions
                        onView={() => onEdit(row)}
                        onEdit={() => onEdit(row)}
                        onDelete={() => onDelete(row)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </AdminTable>
          {!pagination.visibleItems.length && (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">{emptyLabel}</p>
          )}
          <ListPaginationFooter
            loadMode={list.loadMode}
            total={pagination.total}
            page={pagination.page}
            totalPages={pagination.totalPages}
            showingFrom={pagination.showingFrom}
            showingTo={pagination.showingTo}
            hasMore={pagination.hasMore}
            onPageChange={list.setPage}
            onLoadMore={() => list.setInfinitePages((n) => n + 1)}
          />
        </AdminTableCard>
      ) : (
        <EntityGrid>
          {pagination.visibleItems.map((row) => {
            const primary = columns.find((c) => c.gridPrimary)?.gridPrimary?.(row);
            return (
              <EntityGridCard key={rowKey(row)}>
                {primary && (
                  <UserTableCell name={primary.title} subId={primary.subtitle} email={primary.title} />
                )}
                <div className="text-muted-foreground mt-3 space-y-1 text-xs">
                  {columns
                    .filter((c) => !c.gridPrimary)
                    .map((c) => (
                      <div key={c.key} className="flex justify-between gap-2">
                        <span>{c.header}</span>
                        <span className="text-foreground font-medium">{c.cell(row)}</span>
                      </div>
                    ))}
                </div>
                {canEdit && (
                  <div className="mt-4 flex justify-end gap-1">
                    <InlineRowActions
                      onView={() => onEdit(row)}
                      onEdit={() => onEdit(row)}
                      onDelete={() => onDelete(row)}
                    />
                  </div>
                )}
              </EntityGridCard>
            );
          })}
          {!pagination.visibleItems.length && (
            <p className="text-muted-foreground col-span-full py-8 text-center text-sm">{emptyLabel}</p>
          )}
        </EntityGrid>
      )}
    </div>
  );
}

export function EmailCell({ email }: { email: string }) {
  return <UserTableCell name={email} email={email} />;
}

export function GoalBadge({ goal }: { goal: string }) {
  return (
    <StatusBadge variant={goal === "achieved" ? "success" : "warning"}>
      {goal}
    </StatusBadge>
  );
}

export function DateCell({ value }: { value: string }) {
  return <span className="text-muted-foreground text-sm">{formatLastSeen(value)}</span>;
}

export function JoinedEmailsCell({ emails }: { emails: string[] }) {
  if (!emails.length) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <ul className={cn("max-w-xs space-y-0.5 text-xs")}>
      {emails.slice(0, 4).map((e) => (
        <li key={e} className="truncate">
          {e}
        </li>
      ))}
      {emails.length > 4 && (
        <li className="text-muted-foreground">+{emails.length - 4}</li>
      )}
    </ul>
  );
}
