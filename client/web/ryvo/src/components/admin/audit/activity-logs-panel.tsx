"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, UserCog, Users } from "lucide-react";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  shortUserId,
  SortableTableHeader,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { LIST_LAYOUT, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { auditService, type AuditLogRow } from "@/services/audit.service";

function actionCategory(action: string): string {
  if (action.startsWith("user.")) return "user";
  if (action.startsWith("driver.") || action.startsWith("kyc.")) return "driver";
  if (action.startsWith("tariff.") || action.startsWith("subscription.") || action.startsWith("paycheck.")) {
    return "finance";
  }
  if (action.startsWith("role.") || action.startsWith("coupon.") || action.startsWith("campaign.")) {
    return "admin";
  }
  return "other";
}

type ActivityLogsPanelProps = {
  variant?: "admin" | "portal";
};

export function ActivityLogsPanel({ variant = "admin" }: ActivityLogsPanelProps) {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const { hasPermission } = useRbac();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const list = useListControls(SORT_KEYS.createdAt);
  const isPortal = variant === "portal";

  const { data, isLoading } = useQuery({
    queryKey: isPortal ? ["portal", "activity", user?.id] : ["admin", "activity"],
    queryFn: () => auditService.listActivityLogs(accessToken),
    enabled:
      Boolean(accessToken) && (isPortal || hasPermission(PERMISSIONS.audit.read)),
  });

  const allLogs = useMemo(() => {
    const logs = data?.logs ?? [];
    if (isPortal && user?.id) {
      return logs.filter((l) => l.actor_id === user.id);
    }
    return logs;
  }, [data?.logs, isPortal, user?.id]);

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const today = allLogs.filter((l) => new Date(l.created_at).getTime() >= dayAgo).length;
    const actors = new Set(allLogs.map((l) => l.actor_id).filter(Boolean));
    const finance = allLogs.filter((l) => actionCategory(l.action) === "finance").length;
    return { total: allLogs.length, today, actors: actors.size, finance };
  }, [allLogs]);

  const logs = useMemo(() => {
    let rows = [...allLogs];
    if (categoryFilter !== "all") {
      rows = rows.filter((l) => actionCategory(l.action) === categoryFilter);
    }
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          (l.target_type ?? "").toLowerCase().includes(q) ||
          (l.target_id ?? "").toLowerCase().includes(q) ||
          (l.actor_id ?? "").toLowerCase().includes(q),
      );
    }
    const sort = list.activeSort;
    if (sort) {
      rows.sort((a, b) => {
        if (sort.key === SORT_KEYS.status) return compareSortable(a.action, b.action, sort.dir);
        return compareSortable(a.created_at, b.created_at, sort.dir);
      });
    }
    return rows;
  }, [allLogs, categoryFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(logs, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, categoryFilter],
  });

  const categoryOptions = [
    { value: "all", label: t("activity.filter.all") },
    { value: "user", label: t("activity.filter.users") },
    { value: "driver", label: t("activity.filter.drivers") },
    { value: "finance", label: t("activity.filter.finance") },
    { value: "admin", label: t("activity.filter.admin") },
    { value: "other", label: t("activity.filter.other") },
  ];

  const gridSortOptions = [
    { value: `${SORT_KEYS.createdAt}:desc`, label: t("list.sortCreatedDesc") },
    { value: `${SORT_KEYS.createdAt}:asc`, label: t("list.sortCreatedAsc") },
  ];

  return (
    <AdminListStack>
      <AdminStatGrid>
        <AdminStatCard icon={ClipboardList} label={t("activity.stats.total")} value={stats.total} />
        <AdminStatCard icon={Users} tone="info" label={t("activity.stats.today")} value={stats.today} />
        <AdminStatCard icon={UserCog} label={t("activity.stats.actors")} value={stats.actors} />
        <AdminStatCard
          icon={ClipboardList}
          tone="success"
          label={t("activity.stats.finance")}
          value={stats.finance}
        />
      </AdminStatGrid>

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("activity.search")}
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
        filters={
          <AdminFilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
          />
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : (
        <AdminTableCard
          isEmpty={!logs.length}
          empty={
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
          }
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <SortableTableHeader
                  label={t("activity.col.when")}
                  sortKey={SORT_KEYS.createdAt}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <SortableTableHeader
                  label={t("activity.col.action")}
                  sortKey={SORT_KEYS.status}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("activity.col.target")}</th>
                <th className="px-5 py-3.5">{t("activity.col.actor")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((log) => (
                <tr key={log.id} className="border-border hover:bg-muted/30 border-t transition">
                  <td className="text-muted-foreground px-5 py-3 text-xs">
                    {formatLastSeen(log.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge variant="info">{log.action}</StatusBadge>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {log.target_type ?? "—"}
                    {log.target_id ? (
                      <span className="text-muted-foreground font-mono text-xs">
                        {" "}
                        · {log.target_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                    {log.actor_id ? shortUserId(log.actor_id) : t("activity.systemActor")}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      )}

      {!isLoading && logs.length > 0 && (
        <ListPaginationFooter
          loadMode={pagination.loadMode}
          total={pagination.total}
          page={pagination.page}
          totalPages={pagination.totalPages}
          showingFrom={pagination.showingFrom}
          showingTo={pagination.showingTo}
          hasMore={pagination.hasMore}
          onPageChange={pagination.setPage}
          onLoadMore={pagination.loadMore}
        />
      )}
    </AdminListStack>
  );
}
