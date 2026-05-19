"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, UserCheck, Users, UserX } from "lucide-react";

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
import { PermissionGate } from "@/guards/permission-gate";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
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

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<EntityPreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const list = useListControls(SORT_KEYS.updatedAt);
  const selection = useBulkSelection<AdminUserRow>();
  const canDelete = hasPermission(PERMISSIONS.users.delete);

  const deleteFlow = useAdminDeleteFlow({
    executeDelete: async (targets, mode) => {
      for (const target of targets) {
        await rbacService.deleteUser(accessToken, target.id, mode);
      }
    },
    onComplete: () => {
      selection.clear();
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.users(ADMIN_USER_KIND.clients),
    queryFn: () => rbacService.listUsers(accessToken, ADMIN_USER_KIND.clients),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.users.read),
  });

  const allUsers = data?.users ?? [];

  const stats = useMemo(() => {
    const active = allUsers.filter((u) => !u.banned_at).length;
    const suspended = allUsers.filter((u) => u.banned_at).length;
    return { total: allUsers.length, active, suspended };
  }, [allUsers]);

  const users = useMemo(() => {
    let rows = allUsers.filter((u) => {
      if (statusFilter === "active" && u.banned_at) return false;
      if (statusFilter === "suspended" && !u.banned_at) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        u.id.includes(q)
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
  }, [allUsers, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(users, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  const gridSortOptions = [
    { value: `${SORT_KEYS.updatedAt}:desc`, label: t("list.sortUpdatedDesc") },
    { value: `${SORT_KEYS.updatedAt}:asc`, label: t("list.sortUpdatedAsc") },
    { value: `${SORT_KEYS.name}:asc`, label: t("list.sortNameAsc") },
    { value: `${SORT_KEYS.name}:desc`, label: t("list.sortNameDesc") },
    { value: `${SORT_KEYS.email}:asc`, label: t("list.sortEmailAsc") },
    { value: `${SORT_KEYS.email}:desc`, label: t("list.sortEmailDesc") },
  ];

  function openView(u: AdminUserRow) {
    setPreview({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      updated_at: u.updated_at,
      phone: u.phone,
      statusLabel: u.banned_at ? t("users.suspended") : t("users.active"),
    });
    setPreviewOpen(true);
  }

  function userTarget(u: AdminUserRow) {
    return { id: u.id, label: u.full_name ?? u.email, email: u.email };
  }

  function renderUserActions(u: AdminUserRow) {
    return (
      <InlineRowActions
        onView={() => openView(u)}
        onEdit={() => router.push(adminEditPath("users", u.id))}
        onToggle={() => router.push(adminProfilePath("users", u.id))}
        profileLabel={t("actions.profile")}
        onDelete={
          canDelete ? () => deleteFlow.openDeleteDialog([userTarget(u)]) : undefined
        }
      />
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.users.read]} fallback={<p>{t("common.noData")}</p>}>
      <div className="space-y-6">
        <AdminPageHeader
          title={t("nav.users")}
          subtitle={t("users.subtitle")}
          action={
            <PermissionGate permissions={[PERMISSIONS.users.create]}>
              <Link href={ROUTES.admin.users.new}>
                <RyvoButton intent="cta">{t("users.create")}</RyvoButton>
              </Link>
            </PermissionGate>
          }
        />

        <AdminListStack>
          <AdminStatGrid>
            <AdminStatCard
              icon={Users}
              label={t("list.totalUsers")}
              value={stats.total}
              hint={t("list.usersHint")}
            />
            <AdminStatCard
              icon={UserCheck}
              tone="success"
              label={t("list.activeUsers")}
              value={stats.active}
              hint={
                stats.total
                  ? `${Math.round((stats.active / stats.total) * 100)}% ${t("list.ofTotal")}`
                  : undefined
              }
            />
            <AdminStatCard
              icon={UserX}
              tone="warning"
              label={t("list.suspendedUsers")}
              value={stats.suspended}
              hint={t("list.manualAction")}
            />
            <AdminStatCard icon={AlertTriangle} tone="danger" label={t("list.flagged")} value={0} hint="—" />
          </AdminStatGrid>

          <AdminSearchToolbar
            value={list.search}
            onChange={list.setSearch}
            placeholder={t("list.searchUsers")}
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
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: t("list.allStatuses") },
                  { value: "active", label: t("users.active") },
                  { value: "suspended", label: t("users.suspended") },
                ]}
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

          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : list.layout === LIST_LAYOUT.table ? (
            <AdminTableCard
              isEmpty={!users.length}
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
                    <th className="px-5 py-3.5">{t("list.columnRole")}</th>
                    <SortableTableHeader
                      label={t("list.columnLastSeen")}
                      sortKey={SORT_KEYS.updatedAt}
                      activeSort={list.sort}
                      onSort={list.toggleColumnSort}
                    />
                    <th className="px-5 py-3.5">{t("users.status")}</th>
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
                        <UserTableCell
                          name={u.full_name ?? u.email}
                          subId={shortUserId(u.id)}
                          email={u.email}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant="info">{t("users.roleClient")}</StatusBadge>
                      </td>
                      <td className="text-muted-foreground px-5 py-3">{formatLastSeen(u.updated_at)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge variant={u.banned_at ? "danger" : "success"}>
                          {u.banned_at ? t("users.suspended") : t("users.active")}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3">{renderUserActions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : (
            <EntityGrid
              isEmpty={!users.length}
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
                  <UserTableCell
                    name={u.full_name ?? u.email}
                    subId={shortUserId(u.id)}
                    email={u.email}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge variant="info">{t("users.roleClient")}</StatusBadge>
                    <StatusBadge variant={u.banned_at ? "danger" : "success"}>
                      {u.banned_at ? t("users.suspended") : t("users.active")}
                    </StatusBadge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">{formatLastSeen(u.updated_at)}</p>
                  <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    {renderUserActions(u)}
                  </div>
                </EntityGridCard>
              ))}
            </EntityGrid>
          )}

          {!isLoading && users.length > 0 && (
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
          profileHref={preview ? adminProfilePath("users", preview.id) : "#"}
          onEdit={
            preview
              ? () => {
                  setPreviewOpen(false);
                  router.push(adminEditPath("users", preview.id));
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
      </div>
    </PermissionGate>
  );
}
