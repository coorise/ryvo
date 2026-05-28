"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, UserCog, Users } from "lucide-react";

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
  ListSelectCheckbox,
  shortUserId,
  SortableTableHeader,
  UserTableCell,
} from "@/components/admin/admin-list-ui";
import { BulkSelectionBar } from "@/components/admin/bulk-selection-bar";
import { DeleteEntityDialog } from "@/components/admin/delete-entity-dialog";
import { EntityPreviewDialog, type EntityPreviewData } from "@/components/admin/entity-preview-dialog";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PermissionGate } from "@/guards/permission-gate";
import {
  ADMIN_USER_KIND,
  LIST_LAYOUT,
  PERMISSIONS,
  QUERY_KEYS,
  ROUTES,
  SORT_KEYS,
} from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { useAdminDeleteFlow } from "@/hooks/use-admin-delete-flow";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { adminEditPath, adminProfilePath } from "@/lib/admin-paths";
import { formatLastSeen } from "@/lib/format-date";
import { rbacService, type AdminUserRow } from "@/services/rbac.service";
import { cn } from "@/lib/utils";

export function StaffStaffsTab() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const router = useRouter();
  const qc = useQueryClient();
  const selection = useBulkSelection<AdminUserRow>();
  const canDelete = hasPermission(PERMISSIONS.staff.delete);
  const [roleFilter, setRoleFilter] = useState("all");
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
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.staff });
    },
  });

  const staff = useQuery({
    queryKey: QUERY_KEYS.admin.staff,
    queryFn: () => rbacService.listUsers(accessToken, ADMIN_USER_KIND.staff),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.staff.read),
  });

  const allStaff = staff.data?.users ?? [];

  const roleOptions = useMemo(() => {
    const names = new Set<string>();
    for (const u of allStaff) u.roles.forEach((r) => names.add(r));
    return ["all", ...Array.from(names).sort()];
  }, [allStaff]);

  const filtered = useMemo(() => {
    let rows = allStaff.filter((u) => {
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.roles.some((r) => r.includes(q))
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
  }, [allStaff, roleFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(filtered, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, roleFilter],
  });

  const gridSortOptions = [
    { value: `${SORT_KEYS.updatedAt}:desc`, label: t("list.sortUpdatedDesc") },
    { value: `${SORT_KEYS.updatedAt}:asc`, label: t("list.sortUpdatedAsc") },
    { value: `${SORT_KEYS.name}:asc`, label: t("list.sortNameAsc") },
    { value: `${SORT_KEYS.name}:desc`, label: t("list.sortNameDesc") },
    { value: `${SORT_KEYS.email}:asc`, label: t("list.sortEmailAsc") },
    { value: `${SORT_KEYS.email}:desc`, label: t("list.sortEmailDesc") },
  ];

  function userTarget(u: AdminUserRow) {
    return { id: u.id, label: u.full_name ?? u.email, email: u.email };
  }

  function openView(u: AdminUserRow) {
    setPreview({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      roles: u.roles,
      updated_at: u.updated_at,
      phone: u.phone,
    });
    setPreviewOpen(true);
  }

  return (
    <>
      <AdminListStack>
        <div className="flex flex-wrap justify-end gap-2">
          <PermissionGate permissions={[PERMISSIONS.staff.update]}>
            <Link href={ROUTES.admin.staff.assign}>
              <RyvoButton intent="outline">{t("staff.assignRole")}</RyvoButton>
            </Link>
          </PermissionGate>
          <PermissionGate permissions={[PERMISSIONS.staff.create, PERMISSIONS.users.create]}>
            <Link href={ROUTES.admin.staff.new}>
              <RyvoButton intent="cta">{t("staff.createMember")}</RyvoButton>
            </Link>
          </PermissionGate>
        </div>

        <AdminStatGrid>
          <AdminStatCard icon={Users} label={t("list.totalStaff")} value={allStaff.length} />
          <AdminStatCard
            icon={Shield}
            tone="success"
            label={t("list.admins")}
            value={allStaff.filter((u) => u.roles.includes("admin") || u.roles.includes("super_admin")).length}
          />
          <AdminStatCard
            icon={UserCog}
            tone="neutral"
            label={t("list.moderators")}
            value={allStaff.filter((u) => u.roles.includes("moderator")).length}
          />
          <AdminStatCard
            icon={UserCog}
            tone="info"
            label={t("list.supportAgents")}
            value={allStaff.filter((u) => u.roles.some((r) => ["agent", "support"].includes(r))).length}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("list.searchStaff")}
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
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions.map((r) => ({
                value: r,
                label: r === "all" ? t("list.allRoles") : r,
              }))}
            />
          }
        />

        <BulkSelectionBar
          count={selection.count}
          onClear={selection.clear}
          canDelete={canDelete}
          onDelete={() =>
            deleteFlow.openDeleteDialog(selection.pick(pagination.visibleItems).map(userTarget))
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
                  <th className="px-5 py-3.5">{t("staff.roles")}</th>
                  <SortableTableHeader
                    label={t("list.columnLastSeen")}
                    sortKey={SORT_KEYS.updatedAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label="Email"
                    sortKey={SORT_KEYS.email}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                    className="hidden lg:table-cell"
                  />
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((u) => (
                  <tr key={u.id} className="border-border hover:bg-muted/30 border-t transition">
                    <td className="px-3 py-3">
                      <ListSelectCheckbox
                        checked={selection.isSelected(u.id)}
                        onChange={() => selection.toggle(u.id)}
                        ariaLabel={t("list.selectRow")}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <UserTableCell name={u.full_name ?? u.email} subId={shortUserId(u.id)} email={u.email} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={cn(
                              "bg-primary/15 text-primary rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                            )}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{formatLastSeen(u.updated_at)}</td>
                    <td className="text-muted-foreground hidden px-5 py-3 lg:table-cell">{u.email}</td>
                    <td className="px-5 py-3">
                      <InlineRowActions
                        onView={() => openView(u)}
                        onEdit={() => router.push(adminEditPath("staff", u.id))}
                        onToggle={() => router.push(adminProfilePath("staff", u.id))}
                        profileLabel={t("actions.profile")}
                        onDelete={
                          canDelete ? () => deleteFlow.openDeleteDialog([userTarget(u)]) : undefined
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
            {pagination.visibleItems.map((u) => (
              <EntityGridCard
                key={u.id}
                onClick={() => openView(u)}
                selection={
                  <ListSelectCheckbox
                    checked={selection.isSelected(u.id)}
                    onChange={() => selection.toggle(u.id)}
                    ariaLabel={t("list.selectRow")}
                  />
                }
              >
                <UserTableCell name={u.full_name ?? u.email} subId={shortUserId(u.id)} email={u.email} />
                <div className="mt-3 flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <span
                      key={r}
                      className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">{formatLastSeen(u.updated_at)}</p>
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
      </AdminListStack>

      <EntityPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        entity={preview}
        profileHref={preview ? adminProfilePath("staff", preview.id) : "#"}
        onEdit={
          preview
            ? () => {
                setPreviewOpen(false);
                router.push(adminEditPath("staff", preview.id));
              }
            : undefined
        }
      />

      <DeleteEntityDialog
        open={deleteFlow.dialogOpen}
        onOpenChange={deleteFlow.setDialogOpen}
        targets={deleteFlow.pendingTargets}
        onConfirm={deleteFlow.confirmFromDialog}
      />
    </>
  );
}
