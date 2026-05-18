"use client";

import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
} from "@/components/admin/admin-list-ui";
import { UI } from "@/configs/const";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PermissionGate } from "@/guards/permission-gate";
import { ADMIN_TABS, LIST_LAYOUT, PERMISSIONS, ROUTES, SORT_KEYS } from "@/configs/const";
import { useRbac } from "@/hooks/use-rbac";
import { isRolePermissionsEditable, staffListUrl } from "@/lib/admin-staff-url";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatTimestamp } from "@/lib/format-date";
import type { RoleRow } from "@/services/rbac.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StaffRolesTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { matrix, hasPermission } = useRbac();
  const [viewRole, setViewRole] = useState<RoleRow | null>(null);
  const [systemFilter, setSystemFilter] = useState("all");

  const list = useListControls(SORT_KEYS.updatedAt);

  const allRoles = matrix.data?.roles ?? [];

  const filtered = useMemo(() => {
    let rows = allRoles.filter((r) => {
      if (systemFilter === "system" && !r.is_system) return false;
      if (systemFilter === "custom" && r.is_system) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
      );
    });
    const s = list.activeSort;
    if (s) {
      rows = [...rows].sort((a, b) => {
        if (s.key === SORT_KEYS.permissionsCount) {
          return compareSortable(a.permissions?.length ?? 0, b.permissions?.length ?? 0, s.dir);
        }
        if (s.key === SORT_KEYS.updatedAt) {
          return compareSortable(a.updated_at ?? "", b.updated_at ?? "", s.dir);
        }
        return compareSortable(a.name, b.name, s.dir);
      });
    }
    return rows;
  }, [allRoles, systemFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(filtered, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, systemFilter],
  });

  const gridSortOptions = [
    { value: `${SORT_KEYS.roleName}:asc`, label: t("list.sortNameAsc") },
    { value: `${SORT_KEYS.roleName}:desc`, label: t("list.sortNameDesc") },
    { value: `${SORT_KEYS.updatedAt}:desc`, label: t("list.sortUpdatedDesc") },
    { value: `${SORT_KEYS.updatedAt}:asc`, label: t("list.sortUpdatedAsc") },
    { value: `${SORT_KEYS.permissionsCount}:desc`, label: t("list.sortPermissionsDesc") },
  ];

  return (
    <AdminListStack>
      <div className="flex flex-wrap justify-end gap-2">
        <PermissionGate permissions={[PERMISSIONS.roles.create]}>
          <Link href={ROUTES.admin.staff.roles.new}>
            <RyvoButton intent="cta">{t("staff.createRole")}</RyvoButton>
          </Link>
        </PermissionGate>
      </div>

      <AdminStatGrid>
        <AdminStatCard label={t("list.totalRoles")} value={allRoles.length} icon={Users} />
        <AdminStatCard
          label={t("staff.systemRole")}
          value={allRoles.filter((r) => r.is_system).length}
          icon={Shield}
        />
        <AdminStatCard
          label={t("list.customRoles")}
          value={allRoles.filter((r) => !r.is_system).length}
          icon={Users}
        />
      </AdminStatGrid>

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("list.searchRoles")}
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
            value={systemFilter}
            onChange={setSystemFilter}
            options={[
              { value: "all", label: t("list.allRoleTypes") },
              { value: "system", label: t("staff.systemRole") },
              { value: "custom", label: t("list.customRoles") },
            ]}
          />
        }
      />

      {list.layout === LIST_LAYOUT.table ? (
        <AdminTableCard
          isEmpty={!filtered.length}
          empty={<p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>}
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <SortableTableHeader
                  label={t("staff.roleName")}
                  sortKey={SORT_KEYS.roleName}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("staff.roleDescription")}</th>
                <SortableTableHeader
                  label={t("staff.permissionsCount")}
                  sortKey={SORT_KEYS.permissionsCount}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <SortableTableHeader
                  label={t("profile.updatedAt")}
                  sortKey={SORT_KEYS.updatedAt}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((r) => (
                <tr key={r.id} className="border-border hover:bg-muted/30 border-t transition">
                  <td className="px-5 py-3 font-medium">
                    {r.name}
                    {r.is_system && (
                      <span className="ml-2">
                        <StatusBadge variant="default">{t("staff.systemRole")}</StatusBadge>
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-5 py-3">{r.description ?? UI.emptyPlaceholder}</td>
                  <td className="px-5 py-3">{r.permissions?.length ?? 0}</td>
                  <td className="text-muted-foreground px-5 py-3">{formatTimestamp(r.updated_at)}</td>
                  <td className="px-5 py-3">
                    <InlineRowActions
                      onView={() => setViewRole(r)}
                      onEdit={
                        hasPermission(PERMISSIONS.roles.update) && isRolePermissionsEditable(r)
                          ? () =>
                              router.push(
                                staffListUrl(ADMIN_TABS.staff.permissions, r.id),
                              )
                          : undefined
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
          isEmpty={!filtered.length}
          empty={<p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>}
        >
          {pagination.visibleItems.map((r) => (
            <EntityGridCard key={r.id} onClick={() => setViewRole(r)}>
              <p className="font-bold">{r.name}</p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{r.description ?? "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant="info">{r.permissions?.length ?? 0} perms</StatusBadge>
                {r.is_system && <StatusBadge>{t("staff.systemRole")}</StatusBadge>}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">{formatTimestamp(r.updated_at)}</p>
            </EntityGridCard>
          ))}
        </EntityGrid>
      )}

      {filtered.length > 0 && (
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

      <Dialog open={Boolean(viewRole)} onOpenChange={(o) => !o && setViewRole(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRole?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{viewRole?.description}</p>
          <ul className="mt-2 max-h-60 overflow-y-auto text-sm">
            {(viewRole?.permissions ?? []).map((p) => (
              <li key={p} className="border-border border-b py-1">
                {p}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </AdminListStack>
  );
}
