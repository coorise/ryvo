"use client";

import { useQuery } from "@tanstack/react-query";
import { Car, Clock, DollarSign, FileDown, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminPageHeader,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  InlineRowActions,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { adminService } from "@/services";
import { SORT_KEYS } from "@/configs/const";
import { RyvoButton } from "@/components/ryvo/ryvo-button";

export default function AdminRidesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const list = useListControls(SORT_KEYS.createdAt);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: () => adminService.listTrips(accessToken),
    enabled: Boolean(accessToken),
  });

  const all = data?.trips ?? [];

  const stats = useMemo(() => {
    const total = all.length;
    const inProgress = all.filter((r) => r.status !== "cancelled" && r.status !== "expired").length;
    const cancelled = all.filter((r) => r.status === "cancelled" || r.status === "expired").length;
    const revenue = all.reduce((s, r) => s + Number(r.fare_estimate ?? 0), 0);
    const cancelRate = total ? Math.round((cancelled / total) * 1000) / 10 : 0;
    return { total, inProgress, cancelled, revenue, cancelRate };
  }, [all]);

  const rows = useMemo(() => {
    let items = all.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        (r.pickup_address ?? "").toLowerCase().includes(q) ||
        (r.dropoff_address ?? "").toLowerCase().includes(q) ||
        (r.client_id ?? "").toLowerCase().includes(q) ||
        (r.driver_id ?? "").toLowerCase().includes(q)
      );
    });
    const s = list.activeSort;
    if (s) {
      items = [...items].sort((a, b) => {
        if (s.key === SORT_KEYS.createdAt) {
          return compareSortable(a.created_at, b.created_at, s.dir);
        }
        if (s.key === SORT_KEYS.status) {
          return compareSortable(a.status, b.status, s.dir);
        }
        return compareSortable(a.id, b.id, s.dir);
      });
    }
    return items;
  }, [all, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(rows, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  return (
    <PermissionGate permissions={["rides:read"]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader
          title={t("nav.rides")}
          subtitle={`${stats.inProgress} ${t("rides.inProgress")} · ${stats.total} ${t("rides.total")} · ${stats.cancelRate}% ${t("rides.cancelRate")}`}
          action={
            <RyvoButton intent="outline" onClick={() => void 0}>
              <FileDown className="size-4" /> {t("rides.export")}
            </RyvoButton>
          }
        />

        <AdminListStack>
          <AdminStatGrid>
            <AdminStatCard icon={Car} label={t("rides.kpi.total")} value={stats.total} />
            <AdminStatCard icon={Clock} tone="success" label={t("rides.kpi.inProgress")} value={stats.inProgress} />
            <AdminStatCard
              icon={DollarSign}
              tone="info"
              label={t("rides.kpi.revenue")}
              value={`$${stats.revenue.toFixed(2)}`}
            />
            <AdminStatCard
              icon={XCircle}
              tone={stats.cancelRate > 5 ? "danger" : "warning"}
              label={t("rides.kpi.cancelRate")}
              value={`${stats.cancelRate}%`}
            />
          </AdminStatGrid>

          <AdminSearchToolbar
            value={list.search}
            onChange={list.setSearch}
            placeholder={t("rides.search")}
          />

          <ListLayoutToolbar
            layout={list.layout}
            onLayoutChange={list.setLayout}
            loadMode={list.loadMode}
            onLoadModeChange={list.setLoadMode}
            pageSize={list.pageSize}
            onPageSizeChange={list.setPageSize}
            filters={
              <AdminFilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: t("list.allStatuses") },
                  { value: "pending", label: "Pending" },
                  { value: "matched", label: "Matched" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "expired", label: "Expired" },
                ]}
              />
            }
          />

          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : (
            <AdminTableCard
              isEmpty={!rows.length}
              empty={<p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>}
            >
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">{t("rides.pickup")}</th>
                    <th className="px-5 py-3.5">{t("rides.dropoff")}</th>
                    <th className="px-5 py-3.5">{t("rides.fare")}</th>
                    <th className="px-5 py-3.5">{t("rides.status")}</th>
                    <th className="px-5 py-3.5">{t("rides.created")}</th>
                    <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {pagination.visibleItems.map((trip) => (
                    <tr key={trip.id} className="border-border hover:bg-muted/30 border-t transition">
                      <td className="px-5 py-3 font-mono text-xs">{trip.id.slice(0, 8).toUpperCase()}</td>
                      <td className="text-muted-foreground max-w-[220px] truncate px-5 py-3">
                        {trip.pickup_address ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3">
                        <span className="text-muted-foreground text-xs">
                          {(trip.dropoff_address ?? "—").slice(0, 28)}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {trip.fare_estimate != null ? `$${trip.fare_estimate}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant="default">{trip.status}</StatusBadge>
                      </td>
                      <td className="text-muted-foreground px-5 py-3 text-sm">
                        {formatLastSeen(trip.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <InlineRowActions onView={() => void 0} onEdit={undefined} onDelete={undefined} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          )}

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
        </AdminListStack>
      </div>
    </PermissionGate>
  );
}
