"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  ShoppingCart,
} from "lucide-react";

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
  shortUserId,
  SortableTableHeader,
  StatusBadge,
  UserTableCell,
} from "@/components/admin/admin-list-ui";
import { CheckoutPreviewDialog } from "@/components/admin/finance/checkout-preview-dialog";
import { CheckoutRecoveryDialog } from "@/components/admin/finance/checkout-recovery-dialog";
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
import { financeService, type CheckoutSession } from "@/services/finance.service";

function checkoutStatusVariant(
  status: CheckoutSession["status"],
): "success" | "warning" | "danger" | "default" {
  if (status === "completed") return "success";
  if (status === "abandoned") return "warning";
  if (status === "cancelled") return "danger";
  return "default";
}

function checkoutStatusLabel(status: CheckoutSession["status"], t: (k: string) => string) {
  return t(`financeCheckouts.status.${status}`);
}

function sessionLabel(s: CheckoutSession) {
  const route = [s.pickup_address, s.dropoff_address].filter(Boolean).join(" → ");
  return route || shortUserId(s.id);
}

export function CheckoutsPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canUpdate = hasPermission(PERMISSIONS.finance.checkoutsUpdate);
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<CheckoutSession | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CheckoutSession | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<CheckoutSession | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const list = useListControls(SORT_KEYS.updatedAt);

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "checkouts"],
    queryFn: () => financeService.getCheckouts(accessToken),
    enabled: Boolean(accessToken) && hasPermission(PERMISSIONS.finance.checkoutsRead),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeService.deleteCheckout(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeCheckouts.deleted"));
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["finance", "checkouts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scheduleReminder = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        message: string;
        send_email: boolean;
        send_push: boolean;
        delay_minutes: number;
      };
    }) => financeService.scheduleCheckoutRecovery(accessToken, id, body),
    onSuccess: () => {
      toast.success(t("financeCheckouts.reminderScheduled"));
      setRecoveryOpen(false);
      setRecoveryTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allSessions = data?.sessions ?? [];

  const stats = useMemo(() => {
    const completed = allSessions.filter((s) => s.status === "completed").length;
    const abandoned = allSessions.filter((s) => s.status === "abandoned").length;
    const withFare = allSessions.filter((s) => s.fare_estimate != null);
    const fareTotal = withFare.reduce((sum, s) => sum + (s.fare_estimate ?? 0), 0);
    return {
      total: allSessions.length,
      completed,
      abandoned,
      fareTotal,
    };
  }, [allSessions]);

  const sessions = useMemo(() => {
    let rows = [...allSessions];
    if (statusFilter !== "all") {
      rows = rows.filter((s) => s.status === statusFilter);
    }
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.client_id.toLowerCase().includes(q) ||
          (s.driver_id ?? "").toLowerCase().includes(q) ||
          (s.pickup_address ?? "").toLowerCase().includes(q) ||
          (s.dropoff_address ?? "").toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.status.includes(q),
      );
    }
    const sort = list.activeSort;
    if (sort) {
      rows.sort((a, b) => {
        if (sort.key === SORT_KEYS.status) return compareSortable(a.status, b.status, sort.dir);
        if (sort.key === SORT_KEYS.amount) {
          return compareSortable(a.fare_estimate ?? 0, b.fare_estimate ?? 0, sort.dir);
        }
        if (sort.key === SORT_KEYS.name) {
          return compareSortable(a.pickup_address ?? "", b.pickup_address ?? "", sort.dir);
        }
        return compareSortable(a.last_event_at, b.last_event_at, sort.dir);
      });
    }
    return rows;
  }, [allSessions, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(sessions, {
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
    { value: `${SORT_KEYS.amount}:desc`, label: t("financeCheckouts.sortFareDesc") },
    { value: `${SORT_KEYS.amount}:asc`, label: t("financeCheckouts.sortFareAsc") },
  ];

  const statusOptions = [
    { value: "all", label: t("list.allStatuses") },
    { value: "open", label: t("financeCheckouts.status.open") },
    { value: "abandoned", label: t("financeCheckouts.status.abandoned") },
    { value: "cancelled", label: t("financeCheckouts.status.cancelled") },
    { value: "completed", label: t("financeCheckouts.status.completed") },
  ];

  function openPreview(s: CheckoutSession) {
    setPreview(s);
    setPreviewOpen(true);
  }

  function openRecovery(s: CheckoutSession) {
    setRecoveryTarget(s);
    setRecoveryOpen(true);
  }

  function renderRowActions(s: CheckoutSession) {
    return (
      <InlineRowActions
        onView={() => openPreview(s)}
        onRemind={
          canUpdate && s.status === "abandoned" ? () => openRecovery(s) : undefined
        }
        remindLabel={t("financeCheckouts.recovery.title")}
        onDelete={canUpdate ? () => setDeleteTarget(s) : undefined}
      />
    );
  }

  function renderRoute(s: CheckoutSession) {
    const from = s.pickup_address ?? "—";
    const to = s.dropoff_address ?? "—";
    return (
      <div className="max-w-xs">
        <p className="truncate text-sm">{from}</p>
        <p className="text-muted-foreground truncate text-xs">→ {to}</p>
      </div>
    );
  }

  return (
    <>
      <AdminListStack>
        <AdminStatGrid>
          <AdminStatCard
            icon={ShoppingCart}
            label={t("financeCheckouts.stats.total")}
            value={stats.total}
            hint={t("financeCheckouts.stats.totalHint")}
          />
          <AdminStatCard
            icon={CheckCircle2}
            tone="success"
            label={t("financeCheckouts.stats.completed")}
            value={stats.completed}
            hint={
              stats.total
                ? `${Math.round((stats.completed / stats.total) * 100)}% ${t("list.ofTotal")}`
                : undefined
            }
          />
          <AdminStatCard
            icon={AlertCircle}
            tone="warning"
            label={t("financeCheckouts.stats.abandoned")}
            value={stats.abandoned}
            hint={t("financeCheckouts.stats.abandonedHint")}
          />
          <AdminStatCard
            icon={MapPin}
            tone="info"
            label={t("financeCheckouts.stats.fareVolume")}
            value={`$${stats.fareTotal.toFixed(2)}`}
            hint={t("financeCheckouts.stats.fareVolumeHint")}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("financeCheckouts.search")}
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
              options={statusOptions}
            />
          }
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : list.layout === LIST_LAYOUT.table ? (
          <AdminTableCard
            isEmpty={!sessions.length}
            empty={
              <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <SortableTableHeader
                    label={t("financeCheckouts.col.status")}
                    sortKey={SORT_KEYS.status}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("financeCheckouts.col.client")}</th>
                  <th className="px-5 py-3.5">{t("financeCheckouts.col.driver")}</th>
                  <SortableTableHeader
                    label={t("financeCheckouts.col.route")}
                    sortKey={SORT_KEYS.name}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("financeCheckouts.col.fare")}
                    sortKey={SORT_KEYS.amount}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("financeCheckouts.col.planned")}</th>
                  <SortableTableHeader
                    label={t("financeCheckouts.col.lastEvent")}
                    sortKey={SORT_KEYS.updatedAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((s) => (
                  <tr key={s.id} className="border-border hover:bg-muted/30 border-t transition">
                    <td className="px-5 py-3">
                      <StatusBadge variant={checkoutStatusVariant(s.status)}>
                        {checkoutStatusLabel(s.status, t)}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <UserTableCell
                        name={t("users.roleClient")}
                        subId={shortUserId(s.client_id)}
                      />
                    </td>
                    <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                      {s.driver_id ? shortUserId(s.driver_id) : "—"}
                    </td>
                    <td className="px-5 py-3">{renderRoute(s)}</td>
                    <td className="px-5 py-3 font-semibold">
                      {s.fare_estimate != null ? `$${s.fare_estimate}` : "—"}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
                      {s.planned_at ? formatLastSeen(s.planned_at) : "—"}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
                      {formatLastSeen(s.last_event_at)}
                    </td>
                    <td className="px-5 py-3">{renderRowActions(s)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        ) : (
          <EntityGrid
            isEmpty={!sessions.length}
            empty={
              <p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            {pagination.visibleItems.map((s) => (
              <EntityGridCard key={s.id} onClick={() => openPreview(s)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <StatusBadge variant={checkoutStatusVariant(s.status)}>
                    {checkoutStatusLabel(s.status, t)}
                  </StatusBadge>
                  {s.fare_estimate != null && (
                    <span className="text-sm font-semibold">${s.fare_estimate}</span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">{t("users.roleClient")}</p>
                <p className="text-muted-foreground font-mono text-xs">{shortUserId(s.client_id)}</p>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                  {s.pickup_address ?? "—"} → {s.dropoff_address ?? "—"}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatLastSeen(s.last_event_at)}
                </p>
                <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  {renderRowActions(s)}
                </div>
              </EntityGridCard>
            ))}
          </EntityGrid>
        )}

        {!isLoading && sessions.length > 0 && (
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

      <CheckoutPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} session={preview} />

      <CheckoutRecoveryDialog
        open={recoveryOpen}
        onOpenChange={(open) => {
          setRecoveryOpen(open);
          if (!open) setRecoveryTarget(null);
        }}
        session={recoveryTarget}
        pending={scheduleReminder.isPending}
        onConfirm={(body) => {
          if (!recoveryTarget) return;
          scheduleReminder.mutate({ id: recoveryTarget.id, body });
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("financeCheckouts.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("financeCheckouts.confirmDeleteDesc")}
              {deleteTarget ? (
                <span className="mt-2 block font-medium text-foreground">{sessionLabel(deleteTarget)}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) remove.mutate(deleteTarget.id);
              }}
            >
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
