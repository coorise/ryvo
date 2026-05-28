"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Globe, Lock, Shield } from "lucide-react";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
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
import { auditService, type SecurityAuthEvent } from "@/services/audit.service";

function severityVariant(s: SecurityAuthEvent["severity"]): "danger" | "warning" | "default" {
  if (s === "critical") return "danger";
  if (s === "warning") return "warning";
  return "default";
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SecurityAuthLogsPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const [severityFilter, setSeverityFilter] = useState("all");
  const list = useListControls(SORT_KEYS.createdAt);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "security", "auth", severityFilter],
    queryFn: () =>
      auditService.listSecurityAuthEvents(
        accessToken,
        severityFilter === "all" ? undefined : severityFilter,
      ),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.audit.read),
  });

  const allEvents = data?.events ?? [];

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = allEvents.filter((e) => new Date(e.created_at).getTime() >= dayAgo);
    const critical = recent.filter((e) => e.severity === "critical").length;
    const warning = allEvents.filter((e) => e.severity === "warning").length;
    const withMfa = allEvents.filter((e) => e.mfa_used === true).length;
    const mfaPct = allEvents.length ? Math.round((withMfa / allEvents.length) * 1000) / 10 : 0;
    const ips = new Set(allEvents.map((e) => e.ip).filter(Boolean));
    return { critical, warning, mfaPct, uniqueIps: ips.size };
  }, [allEvents]);

  const events = useMemo(() => {
    let rows = [...allEvents];
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.event_type.toLowerCase().includes(q) ||
          (e.actor_label ?? "").toLowerCase().includes(q) ||
          (e.ip ?? "").toLowerCase().includes(q) ||
          (e.details ?? "").toLowerCase().includes(q) ||
          (e.country_code ?? "").toLowerCase().includes(q),
      );
    }
    const sort = list.activeSort;
    if (sort) {
      rows.sort((a, b) => {
        if (sort.key === SORT_KEYS.status) return compareSortable(a.severity, b.severity, sort.dir);
        return compareSortable(a.created_at, b.created_at, sort.dir);
      });
    }
    return rows;
  }, [allEvents, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(events, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, severityFilter],
  });

  const severityOptions = [
    { value: "all", label: t("security.severity.all") },
    { value: "critical", label: t("security.severity.critical") },
    { value: "warning", label: t("security.severity.warning") },
    { value: "info", label: t("security.severity.info") },
  ];

  const gridSortOptions = [
    { value: `${SORT_KEYS.createdAt}:desc`, label: t("list.sortCreatedDesc") },
    { value: `${SORT_KEYS.createdAt}:asc`, label: t("list.sortCreatedAsc") },
  ];

  return (
    <AdminListStack>
      <AdminStatGrid>
        <AdminStatCard
          icon={AlertTriangle}
          tone="danger"
          label={t("security.stats.critical24h")}
          value={stats.critical}
        />
        <AdminStatCard icon={Lock} tone="warning" label={t("security.stats.warnings")} value={stats.warning} />
        <AdminStatCard
          icon={Shield}
          tone="success"
          label={t("security.stats.mfaActive")}
          value={`${stats.mfaPct}%`}
        />
        <AdminStatCard icon={Globe} tone="info" label={t("security.stats.uniqueIps")} value={stats.uniqueIps} />
      </AdminStatGrid>

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("security.searchAuth")}
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
            value={severityFilter}
            onChange={setSeverityFilter}
            options={severityOptions}
          />
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : list.layout === LIST_LAYOUT.table ? (
        <AdminTableCard
          isEmpty={!events.length}
          empty={
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
          }
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <SortableTableHeader
                  label={t("security.col.time")}
                  sortKey={SORT_KEYS.createdAt}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <SortableTableHeader
                  label={t("security.col.severity")}
                  sortKey={SORT_KEYS.status}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("security.col.type")}</th>
                <th className="px-5 py-3.5">{t("security.col.actor")}</th>
                <th className="px-5 py-3.5">{t("security.col.ipCountry")}</th>
                <th className="px-5 py-3.5">{t("security.col.mfa")}</th>
                <th className="px-5 py-3.5">{t("security.col.details")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((e) => (
                <tr key={e.id} className="border-border hover:bg-muted/30 border-t transition">
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                    {formatEventTime(e.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={severityVariant(e.severity)}>
                      {e.severity.toUpperCase()}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{e.event_type}</td>
                  <td className="px-5 py-3">
                    <span className="text-primary font-medium">{e.actor_label ?? "—"}</span>
                  </td>
                  <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                    {e.ip ? `${e.ip}${e.country_code ? ` · ${e.country_code}` : ""}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {e.mfa_used == null ? (
                      "—"
                    ) : e.mfa_used ? (
                      <span className="text-primary font-semibold">✓ {t("security.mfaYes")}</span>
                    ) : (
                      <span className="text-destructive font-semibold">✗ {t("security.mfaNo")}</span>
                    )}
                  </td>
                  <td className="text-muted-foreground max-w-md px-5 py-3 text-sm">{e.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pagination.visibleItems.map((e) => (
            <div key={e.id} className="border-border bg-card rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge variant={severityVariant(e.severity)}>{e.severity.toUpperCase()}</StatusBadge>
                <span className="text-muted-foreground font-mono text-xs">{formatEventTime(e.created_at)}</span>
              </div>
              <p className="mt-2 font-mono text-xs">{e.event_type}</p>
              <p className="text-primary mt-1 text-sm font-medium">{e.actor_label}</p>
              <p className="text-muted-foreground mt-2 text-sm">{e.details}</p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <>
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
          <p className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
            <span>{t("security.footerMeta", { count: events.length })}</span>
            <span>{t("security.footerScan")}</span>
          </p>
        </>
      )}
    </AdminListStack>
  );
}
