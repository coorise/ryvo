"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Laptop, Smartphone, TabletSmartphone, Trash2 } from "lucide-react";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminSearchToolbar,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  InlineRowActions,
  shortUserId,
  SortableTableHeader,
  StatusBadge,
  UserTableCell,
} from "@/components/admin/admin-list-ui";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LIST_LAYOUT, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { auditService, type UserDeviceRow } from "@/services/audit.service";

function platformIcon(platform: string) {
  if (platform === "web") return Laptop;
  if (platform === "android") return TabletSmartphone;
  return Smartphone;
}

export function SecurityDevicesPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canUpdate = hasPermission(PERMISSIONS.audit.update);
  const [statusFilter, setStatusFilter] = useState("all");
  const [revokeTarget, setRevokeTarget] = useState<UserDeviceRow | null>(null);
  const list = useListControls(SORT_KEYS.updatedAt);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "security", "devices"],
    queryFn: () => auditService.listDevices(accessToken, true),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.audit.read),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => auditService.revokeDevice(accessToken, id),
    onSuccess: () => {
      toast.success(t("security.deviceRevoked"));
      setRevokeTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin", "security", "devices"] });
      void qc.invalidateQueries({ queryKey: ["admin", "security", "auth"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allDevices = data?.devices ?? [];

  const stats = useMemo(() => {
    const active = allDevices.filter((d) => !d.revoked_at).length;
    const revoked = allDevices.filter((d) => d.revoked_at).length;
    const ios = allDevices.filter((d) => d.platform === "ios" && !d.revoked_at).length;
    const android = allDevices.filter((d) => d.platform === "android" && !d.revoked_at).length;
    return { total: allDevices.length, active, revoked, ios, android };
  }, [allDevices]);

  const devices = useMemo(() => {
    let rows = [...allDevices];
    if (statusFilter === "active") rows = rows.filter((d) => !d.revoked_at);
    if (statusFilter === "revoked") rows = rows.filter((d) => d.revoked_at);
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.user_email.toLowerCase().includes(q) ||
          (d.device_name ?? "").toLowerCase().includes(q) ||
          d.platform.toLowerCase().includes(q) ||
          d.user_id.toLowerCase().includes(q) ||
          (d.os_version ?? "").toLowerCase().includes(q),
      );
    }
    const sort = list.activeSort;
    if (sort) {
      rows.sort((a, b) => {
        if (sort.key === SORT_KEYS.name) {
          return compareSortable(a.device_name ?? a.platform, b.device_name ?? b.platform, sort.dir);
        }
        if (sort.key === SORT_KEYS.email) {
          return compareSortable(a.user_email, b.user_email, sort.dir);
        }
        return compareSortable(a.last_seen_at ?? a.created_at, b.last_seen_at ?? b.created_at, sort.dir);
      });
    }
    return rows;
  }, [allDevices, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(devices, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  const statusOptions = [
    { value: "all", label: t("list.allStatuses") },
    { value: "active", label: t("security.deviceStatus.active") },
    { value: "revoked", label: t("security.deviceStatus.revoked") },
  ];

  const gridSortOptions = [
    { value: `${SORT_KEYS.updatedAt}:desc`, label: t("list.sortUpdatedDesc") },
    { value: `${SORT_KEYS.email}:asc`, label: t("list.sortEmailAsc") },
    { value: `${SORT_KEYS.name}:asc`, label: t("list.sortNameAsc") },
  ];

  return (
    <>
      <AdminListStack>
        <AdminStatGrid>
          <AdminStatCard icon={Smartphone} label={t("security.deviceStats.total")} value={stats.total} />
          <AdminStatCard
            icon={Smartphone}
            tone="success"
            label={t("security.deviceStats.active")}
            value={stats.active}
          />
          <AdminStatCard
            icon={Trash2}
            tone="warning"
            label={t("security.deviceStats.revoked")}
            value={stats.revoked}
          />
          <AdminStatCard
            icon={TabletSmartphone}
            tone="info"
            label={t("security.deviceStats.mobile")}
            value={`${stats.ios} iOS · ${stats.android} Android`}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("security.searchDevices")}
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
            <AdminFilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          }
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : (
          <AdminTableCard
            isEmpty={!devices.length}
            empty={
              <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <SortableTableHeader
                    label={t("security.col.user")}
                    sortKey={SORT_KEYS.email}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("security.col.device")}
                    sortKey={SORT_KEYS.name}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("security.col.platform")}</th>
                  <th className="px-5 py-3.5">{t("security.col.os")}</th>
                  <SortableTableHeader
                    label={t("security.col.lastSeen")}
                    sortKey={SORT_KEYS.updatedAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("security.col.ipCountry")}</th>
                  <th className="px-5 py-3.5">{t("security.col.status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((d) => {
                  const Icon = platformIcon(d.platform);
                  const revoked = Boolean(d.revoked_at);
                  return (
                    <tr key={d.id} className="border-border hover:bg-muted/30 border-t transition">
                      <td className="px-5 py-3">
                        <UserTableCell name={d.user_email} subId={shortUserId(d.user_id)} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="text-muted-foreground size-4 shrink-0" />
                          <span className="font-medium">{d.device_name ?? d.platform}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                          …{d.token_preview}
                        </p>
                      </td>
                      <td className="px-5 py-3 uppercase">{d.platform}</td>
                      <td className="text-muted-foreground px-5 py-3 text-xs">{d.os_version ?? "—"}</td>
                      <td className="text-muted-foreground px-5 py-3 text-xs">
                        {d.last_seen_at ? formatLastSeen(d.last_seen_at) : "—"}
                      </td>
                      <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                        {d.ip_last ? `${d.ip_last}${d.country_code ? ` · ${d.country_code}` : ""}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant={revoked ? "danger" : "success"}>
                          {revoked ? t("security.deviceStatus.revoked") : t("security.deviceStatus.active")}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3">
                        {canUpdate && !revoked ? (
                          <InlineRowActions onDelete={() => setRevokeTarget(d)} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        )}

        {!isLoading && devices.length > 0 && (
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

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("security.revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("security.revokeDesc", {
                device: revokeTarget?.device_name ?? revokeTarget?.platform ?? "",
                user: revokeTarget?.user_email ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revoke.isPending || revokeTarget?.revoked_at != null}
              onClick={(e) => {
                e.preventDefault();
                if (revokeTarget && !revokeTarget.revoked_at) revoke.mutate(revokeTarget.id);
              }}
            >
              {t("security.revokeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
