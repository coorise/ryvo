"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CheckCircle2, Clock, PauseCircle, Plus } from "lucide-react";
import { toast } from "sonner";

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
import {
  FinanceNotifyActionDialog,
  type FinanceNotifyActionKind,
} from "@/components/admin/finance/finance-notify-action-dialog";
import { PaycheckPreviewDialog } from "@/components/admin/finance/paycheck-preview-dialog";
import {
  DriverSearchField,
  type DriverPick,
} from "@/components/admin/finance/driver-search-field";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIST_LAYOUT, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen, formatTimestamp } from "@/lib/format-date";
import { financeService, type PaycheckRow } from "@/services/finance.service";

function paycheckStatusVariant(status: PaycheckRow["status"]): "success" | "warning" | "danger" | "default" {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "held") return "default";
  if (status === "cancelled") return "danger";
  return "default";
}

export function PaychecksPanel() {
  const { t } = useTranslation();
  const { accessToken, isReady } = useAuth();
  const { hasPermission } = useRbac();
  const queryClient = useQueryClient();
  const canUpdate = hasPermission(PERMISSIONS.finance.paychecksUpdate);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverPick | null>(null);
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<PaycheckRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<PaycheckRow | null>(null);
  const [actionKind, setActionKind] = useState<FinanceNotifyActionKind | null>(null);
  const [editTarget, setEditTarget] = useState<PaycheckRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const list = useListControls(SORT_KEYS.createdAt);

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "paychecks", statusFilter],
    queryFn: () =>
      financeService.getPaychecks(accessToken, statusFilter === "all" ? undefined : statusFilter),
    enabled: isReady && Boolean(accessToken) && hasPermission(PERMISSIONS.finance.paychecksRead),
  });

  const patchPaycheck = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof financeService.patchPaycheck>[2];
    }) => financeService.patchPaycheck(accessToken, id, body),
    onSuccess: () => {
      toast.success(t("financePaychecks.updated"));
      setActionTarget(null);
      setActionKind(null);
      setEditTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePaycheck = useMutation({
    mutationFn: (id: string) => financeService.deletePaycheck(accessToken, id),
    onSuccess: () => {
      toast.success(t("financePaychecks.deleted"));
      setActionTarget(null);
      setActionKind(null);
      void queryClient.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () => {
      if (!selectedDriver) throw new Error("Driver required");
      return financeService.createPaycheck(accessToken, {
        driver_id: selectedDriver.id,
        amount: Number(amount),
        period_label: "Withdrawal",
      });
    },
    onSuccess: () => {
      toast.success(t("financePaychecks.added"));
      setSelectedDriver(null);
      setAmount("");
      setAddOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRows = data?.paychecks ?? [];

  const stats = useMemo(() => {
    const pending = allRows.filter((r) => r.status === "pending");
    const paid = allRows.filter((r) => r.status === "paid");
    const held = allRows.filter((r) => r.status === "held");
    const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);
    return {
      total: allRows.length,
      pending: pending.length,
      paid: paid.length,
      held: held.length,
      pendingTotal,
    };
  }, [allRows]);

  const rows = useMemo(() => {
    let listRows = [...allRows];
    if (list.search) {
      const q = list.search.toLowerCase();
      listRows = listRows.filter(
        (r) =>
          (r.driver_email ?? "").toLowerCase().includes(q) ||
          r.driver_id.toLowerCase().includes(q) ||
          (r.period_label ?? "").toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q),
      );
    }
    const s = list.activeSort;
    if (s) {
      listRows.sort((a, b) => {
        if (s.key === SORT_KEYS.email) {
          return compareSortable(a.driver_email ?? a.driver_id, b.driver_email ?? b.driver_id, s.dir);
        }
        if (s.key === SORT_KEYS.amount) return compareSortable(a.amount, b.amount, s.dir);
        if (s.key === SORT_KEYS.status) return compareSortable(a.status, b.status, s.dir);
        return compareSortable(a.created_at, b.created_at, s.dir);
      });
    }
    return listRows;
  }, [allRows, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(rows, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  const gridSortOptions = [
    { value: `${SORT_KEYS.createdAt}:desc`, label: t("list.sortCreatedDesc") },
    { value: `${SORT_KEYS.createdAt}:asc`, label: t("list.sortCreatedAsc") },
    { value: `${SORT_KEYS.amount}:desc`, label: t("financePaychecks.sortAmountDesc") },
    { value: `${SORT_KEYS.amount}:asc`, label: t("financePaychecks.sortAmountAsc") },
  ];

  const statusOptions = [
    { value: "all", label: t("financePaychecks.all") },
    { value: "pending", label: t("financePaychecks.filterPending") },
    { value: "paid", label: t("financePaychecks.filterPaid") },
    { value: "held", label: t("financePaychecks.filterHeld") },
    { value: "cancelled", label: t("financePaychecks.filterCancelled") },
  ];

  function openPreview(r: PaycheckRow) {
    setPreview(r);
    setPreviewOpen(true);
  }

  function openAction(r: PaycheckRow, kind: FinanceNotifyActionKind) {
    setActionTarget(r);
    setActionKind(kind);
  }

  function renderActions(r: PaycheckRow) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <InlineRowActions
          onView={() => openPreview(r)}
          onEdit={
            canUpdate && (r.status === "pending" || r.status === "held")
              ? () => {
                  setEditTarget(r);
                  setEditAmount(String(r.amount));
                }
              : undefined
          }
          onDelete={canUpdate ? () => openAction(r, "delete") : undefined}
        />
        {canUpdate && r.status === "pending" && (
          <>
            <RyvoButton
              intent="outline"
              className="h-8 px-2 text-xs"
              disabled={patchPaycheck.isPending}
              onClick={() => patchPaycheck.mutate({ id: r.id, body: { action: "pay" } })}
            >
              {t("financePaychecks.pay")}
            </RyvoButton>
            <RyvoButton
              intent="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => openAction(r, "hold")}
            >
              {t("financePaychecks.hold")}
            </RyvoButton>
            <RyvoButton
              intent="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => openAction(r, "cancel")}
            >
              {t("financeActions.cancel")}
            </RyvoButton>
          </>
        )}
        {canUpdate && r.status === "held" && (
          <RyvoButton
            intent="outline"
            className="h-8 px-2 text-xs"
            onClick={() => openAction(r, "resume")}
          >
            {t("financePaychecks.resume")}
          </RyvoButton>
        )}
      </div>
    );
  }

  return (
    <>
      <AdminListStack>
        {canUpdate && (
          <div className="flex justify-end">
            <RyvoButton intent="cta" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {t("financePaychecks.addManual")}
            </RyvoButton>
          </div>
        )}

        <AdminStatGrid>
          <AdminStatCard
            icon={Banknote}
            label={t("financePaychecks.stats.total")}
            value={stats.total}
            hint={t("financePaychecks.stats.totalHint")}
          />
          <AdminStatCard
            icon={Clock}
            tone="warning"
            label={t("financePaychecks.stats.pending")}
            value={stats.pending}
            hint={`$${stats.pendingTotal.toFixed(2)} ${t("financePaychecks.stats.pendingHint")}`}
          />
          <AdminStatCard
            icon={CheckCircle2}
            tone="success"
            label={t("financePaychecks.stats.paid")}
            value={stats.paid}
          />
          <AdminStatCard
            icon={PauseCircle}
            label={t("financePaychecks.stats.held")}
            value={stats.held}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("financePaychecks.search")}
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
            isEmpty={!rows.length}
            empty={
              <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <SortableTableHeader
                    label={t("financePaychecks.col.driver")}
                    sortKey={SORT_KEYS.email}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("financePaychecks.col.amount")}
                    sortKey={SORT_KEYS.amount}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("financePaychecks.col.tariffType")}</th>
                  <th className="px-5 py-3.5">{t("financePaychecks.col.transferDate")}</th>
                  <SortableTableHeader
                    label={t("financePaychecks.col.status")}
                    sortKey={SORT_KEYS.status}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("financePaychecks.col.created")}
                    sortKey={SORT_KEYS.createdAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((r) => (
                  <tr key={r.id} className="border-border hover:bg-muted/30 border-t transition">
                    <td className="px-5 py-3">
                      <UserTableCell
                        name={r.driver_email ?? shortUserId(r.driver_id)}
                        subId={shortUserId(r.driver_id)}
                        email={r.driver_email ?? r.driver_id}
                      />
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      ${r.amount.toFixed(2)} {r.currency}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{r.tariff_name ?? "—"}</td>
                    <td className="text-muted-foreground px-5 py-3 text-xs">
                      {r.transfer_due_at ? formatTimestamp(r.transfer_due_at) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={paycheckStatusVariant(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{formatLastSeen(r.created_at)}</td>
                    <td className="px-5 py-3">{renderActions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        ) : (
          <EntityGrid
            isEmpty={!rows.length}
            empty={
              <p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            {pagination.visibleItems.map((r) => (
              <EntityGridCard key={r.id} onClick={() => openPreview(r)}>
                <UserTableCell
                  name={r.driver_email ?? shortUserId(r.driver_id)}
                  subId={shortUserId(r.driver_id)}
                  email={r.driver_email ?? r.driver_id}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge variant={paycheckStatusVariant(r.status)}>{r.status}</StatusBadge>
                  <span className="text-sm font-semibold">
                    ${r.amount.toFixed(2)} {r.currency}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {r.tariff_name ?? "—"} · {formatLastSeen(r.created_at)}
                </p>
                <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  {renderActions(r)}
                </div>
              </EntityGridCard>
            ))}
          </EntityGrid>
        )}

        {!isLoading && rows.length > 0 && (
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

      <PaycheckPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} paycheck={preview} />

      <FinanceNotifyActionDialog
        open={Boolean(actionTarget && actionKind)}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null);
            setActionKind(null);
          }
        }}
        kind={actionKind ?? "hold"}
        title={
          actionKind === "hold"
            ? t("financePaychecks.holdTitle")
            : actionKind === "resume"
              ? t("financePaychecks.resumeTitle")
              : actionKind === "cancel"
                ? t("financePaychecks.cancelTitle")
                : t("financePaychecks.deleteTitle")
        }
        description={
          actionKind === "hold"
            ? t("financePaychecks.holdDesc")
            : actionKind === "resume"
              ? t("financePaychecks.resumeDesc")
              : actionKind === "cancel"
                ? t("financePaychecks.cancelDesc")
                : actionTarget?.status === "held"
                  ? t("financePaychecks.deleteHeldBlocked")
                  : t("financePaychecks.deleteDesc")
        }
        dangerous={actionKind === "delete"}
        requireReason={actionKind === "hold" || actionKind === "cancel"}
        confirmLabel={
          actionKind === "delete"
            ? t("actions.delete")
            : actionKind === "hold"
              ? t("financePaychecks.hold")
              : actionKind === "resume"
                ? t("financePaychecks.resume")
                : t("financeActions.cancel")
        }
        pending={patchPaycheck.isPending || removePaycheck.isPending}
        onConfirm={({ reason, notify }) => {
          if (!actionTarget || !actionKind) return;
          if (actionKind === "delete") {
            if (actionTarget.status === "held") {
              toast.error(t("financePaychecks.deleteHeldBlocked"));
              return;
            }
            removePaycheck.mutate(actionTarget.id);
            return;
          }
          patchPaycheck.mutate({
            id: actionTarget.id,
            body: { action: actionKind, reason, notify },
          });
        }}
      />

      <Dialog open={Boolean(editTarget)} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financePaychecks.editAmount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>{t("financePaychecks.amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setEditTarget(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="cta"
              disabled={!editAmount || patchPaycheck.isPending}
              onClick={() =>
                editTarget &&
                patchPaycheck.mutate({
                  id: editTarget.id,
                  body: { amount: Number(editAmount) },
                })
              }
            >
              {t("common.save")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setSelectedDriver(null);
            setAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financePaychecks.addManual")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <DriverSearchField value={selectedDriver} onChange={setSelectedDriver} />
            <div className="space-y-1">
              <Label>{t("financePaychecks.amount")}</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="cta"
              disabled={!selectedDriver || !amount || create.isPending}
              onClick={() => create.mutate()}
            >
              {t("financePaychecks.addManual")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
