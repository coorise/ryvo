"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Car, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
  EntityGrid,
  EntityGridCard,
  InlineRowActions,
  ListSelectCheckbox,
  shortUserId,
  SortableTableHeader,
  StatusBadge,
  UserTableCell,
} from "@/components/admin/admin-list-ui";
import { BulkSelectionBar } from "@/components/admin/bulk-selection-bar";
import { DeleteEntityDialog } from "@/components/admin/delete-entity-dialog";
import { EntityPreviewDialog, type EntityPreviewData } from "@/components/admin/entity-preview-dialog";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { StarRating } from "@/components/admin/star-rating";
import { PermissionGate } from "@/guards/permission-gate";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { KYC_STATUS, LIST_LAYOUT, PERMISSIONS, QUERY_KEYS, ROUTES, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { useAdminDeleteFlow } from "@/hooks/use-admin-delete-flow";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { adminProfilePath } from "@/lib/admin-paths";
import { formatLastSeen } from "@/lib/format-date";
import { driversService, type DriverDetail } from "@/services/drivers.service";
import { rbacService } from "@/services/rbac.service";

function kycVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === KYC_STATUS.approved) return "success";
  if (status === KYC_STATUS.rejected) return "danger";
  if (status === KYC_STATUS.pending) return "warning";
  return "default";
}

export default function AdminDriversPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const router = useRouter();
  const qc = useQueryClient();
  const selection = useBulkSelection<DriverDetail>();
  const canDelete = hasPermission(PERMISSIONS.drivers.delete);
  const [kycFilter, setKycFilter] = useState("all");
  const [preview, setPreview] = useState<EntityPreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const list = useListControls(SORT_KEYS.updatedAt);

  const deleteFlow = useAdminDeleteFlow({
    executeDelete: async (targets, mode) => {
      for (const target of targets) {
        await rbacService.deleteUser(accessToken, target.id, mode);
      }
    },
    onComplete: () => {
      selection.clear();
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.drivers });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.drivers,
    queryFn: () => driversService.listDrivers(accessToken),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.drivers.read),
  });

  const allDrivers = data?.drivers ?? [];

  const stats = useMemo(
    () => ({
      total: allDrivers.length,
      pending: allDrivers.filter((d) => d.kyc_status === KYC_STATUS.pending).length,
      approved: allDrivers.filter((d) => d.kyc_status === KYC_STATUS.approved).length,
      rejected: allDrivers.filter((d) => d.kyc_status === KYC_STATUS.rejected).length,
    }),
    [allDrivers],
  );

  const drivers = useMemo(() => {
    let rows = allDrivers.filter((d) => {
      if (kycFilter !== "all" && d.kyc_status !== kycFilter) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        d.email.toLowerCase().includes(q) ||
        (d.full_name ?? "").toLowerCase().includes(q) ||
        d.id.includes(q)
      );
    });
    const s = list.activeSort;
    if (s) {
      rows = [...rows].sort((a, b) => {
        if (s.key === SORT_KEYS.email) return compareSortable(a.email, b.email, s.dir);
        if (s.key === SORT_KEYS.name) {
          return compareSortable(a.full_name ?? a.email, b.full_name ?? b.email, s.dir);
        }
        return compareSortable(a.updated_at, b.updated_at, s.dir);
      });
    }
    return rows;
  }, [allDrivers, kycFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(drivers, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, kycFilter],
  });

  const gridSortOptions = [
    { value: `${SORT_KEYS.updatedAt}:desc`, label: t("list.sortUpdatedDesc") },
    { value: `${SORT_KEYS.updatedAt}:asc`, label: t("list.sortUpdatedAsc") },
    { value: `${SORT_KEYS.name}:asc`, label: t("list.sortNameAsc") },
    { value: `${SORT_KEYS.name}:desc`, label: t("list.sortNameDesc") },
    { value: `${SORT_KEYS.email}:asc`, label: t("list.sortEmailAsc") },
    { value: `${SORT_KEYS.email}:desc`, label: t("list.sortEmailDesc") },
  ];

  function driverTarget(d: DriverDetail) {
    return { id: d.id, label: d.full_name ?? d.email, email: d.email };
  }

  function openView(d: DriverDetail) {
    setPreview({
      id: d.id,
      full_name: d.full_name,
      email: d.email,
      phone: d.phone,
      updated_at: d.updated_at,
      statusLabel: d.kyc_status,
    });
    setPreviewOpen(true);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("nav.driverKyc")}
        subtitle={t("drivers.subtitle")}
        action={
          <PermissionGate permissions={[PERMISSIONS.drivers.create]}>
            <Link href={ROUTES.admin.drivers.new}>
              <RyvoButton intent="cta">{t("drivers.create")}</RyvoButton>
            </Link>
          </PermissionGate>
        }
      />

      <AdminListStack>
        <AdminStatGrid>
          <AdminStatCard icon={Car} label={t("list.totalDrivers")} value={stats.total} />
          <AdminStatCard icon={Clock} tone="warning" label={t("list.pendingKyc")} value={stats.pending} />
          <AdminStatCard icon={CheckCircle2} tone="success" label={t("list.approvedKyc")} value={stats.approved} />
          <AdminStatCard icon={XCircle} tone="danger" label={t("list.rejectedKyc")} value={stats.rejected} />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("list.searchDrivers")}
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
              value={kycFilter}
              onChange={setKycFilter}
              options={[
                { value: "all", label: t("list.allStatuses") },
                { value: KYC_STATUS.pending, label: KYC_STATUS.pending },
                { value: KYC_STATUS.approved, label: KYC_STATUS.approved },
                { value: KYC_STATUS.rejected, label: KYC_STATUS.rejected },
              ]}
            />
          }
        />

        <BulkSelectionBar
          count={selection.count}
          onClear={selection.clear}
          canDelete={canDelete}
          onDelete={() =>
            deleteFlow.openDeleteDialog(selection.pick(pagination.visibleItems).map(driverTarget))
          }
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : list.layout === LIST_LAYOUT.table ? (
          <AdminTableCard
            isEmpty={!drivers.length}
            empty={<p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>}
          >
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <th className="w-12 px-3 py-3.5">
                    <ListSelectCheckbox
                      checked={selection.isAllSelected(pagination.visibleItems)}
                      indeterminate={selection.isSomeSelected(pagination.visibleItems)}
                      onChange={() => selection.toggleAll(pagination.visibleItems)}
                      ariaLabel={t("list.selectAll")}
                    />
                  </th>
                  <SortableTableHeader
                    label={t("list.columnUser")}
                    sortKey={SORT_KEYS.name}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("drivers.kycStatus")}</th>
                  <th className="px-5 py-3.5">{t("profile.rating")}</th>
                  <th className="px-5 py-3.5">{t("profile.trips")}</th>
                  <SortableTableHeader
                    label={t("list.columnLastSeen")}
                    sortKey={SORT_KEYS.updatedAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((d: DriverDetail) => (
                  <tr key={d.id} className="border-border hover:bg-muted/30 border-t transition">
                    <td className="px-3 py-3">
                      <ListSelectCheckbox
                        checked={selection.isSelected(d.id)}
                        onChange={() => selection.toggle(d.id)}
                        ariaLabel={t("list.selectRow")}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <UserTableCell name={d.full_name ?? d.email} subId={shortUserId(d.id)} email={d.email} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={kycVariant(d.kyc_status)}>{d.kyc_status}</StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <StarRating value={d.rating_avg ?? 0} />
                    </td>
                    <td className="px-5 py-3 font-semibold">{d.trip_count ?? 0}</td>
                    <td className="text-muted-foreground px-5 py-3">{formatLastSeen(d.updated_at)}</td>
                    <td className="px-5 py-3">
                      <InlineRowActions
                        onView={() => openView(d)}
                        onEdit={() => router.push(adminProfilePath("drivers", d.id))}
                        onDelete={
                          canDelete ? () => deleteFlow.openDeleteDialog([driverTarget(d)]) : undefined
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        ) : (
          <EntityGrid
            isEmpty={!drivers.length}
            empty={<p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>}
          >
            {pagination.visibleItems.map((d: DriverDetail) => (
              <EntityGridCard
                key={d.id}
                onClick={() => openView(d)}
                selection={
                  <ListSelectCheckbox
                    checked={selection.isSelected(d.id)}
                    onChange={() => selection.toggle(d.id)}
                    ariaLabel={t("list.selectRow")}
                  />
                }
              >
                <UserTableCell name={d.full_name ?? d.email} subId={shortUserId(d.id)} email={d.email} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={kycVariant(d.kyc_status)}>{d.kyc_status}</StatusBadge>
                  <StarRating value={d.rating_avg ?? 0} />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("profile.trips")}: {d.trip_count ?? 0} · {formatLastSeen(d.updated_at)}
                </p>
              </EntityGridCard>
            ))}
          </EntityGrid>
        )}

        {!isLoading && drivers.length > 0 && (
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

      <EntityPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        entity={preview}
        profileHref={preview ? adminProfilePath("drivers", preview.id) : "#"}
      />

      <DeleteEntityDialog
        open={deleteFlow.dialogOpen}
        onOpenChange={deleteFlow.setDialogOpen}
        targets={deleteFlow.pendingTargets}
        onConfirm={deleteFlow.confirmFromDialog}
      />
    </div>
  );
}
