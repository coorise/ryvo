"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Users } from "lucide-react";
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
  InlineRowActions,
  SortableTableHeader,
  StatusBadge,
  UserTableCell,
  shortUserId,
} from "@/components/admin/admin-list-ui";
import {
  FinanceNotifyActionDialog,
  type FinanceNotifyActionKind,
} from "@/components/admin/finance/finance-notify-action-dialog";
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
import { formatLastSeen } from "@/lib/format-date";
import { financeService, type TariffSubscriptionRow } from "@/services/finance.service";

export function TariffSubscribersPanel() {
  const { t } = useTranslation();
  const { accessToken, isReady } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canUpdate = hasPermission(PERMISSIONS.finance.subscriptionsUpdate);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [actionTarget, setActionTarget] = useState<TariffSubscriptionRow | null>(null);
  const [actionKind, setActionKind] = useState<FinanceNotifyActionKind | null>(null);
  const list = useListControls(SORT_KEYS.createdAt);

  const { data: tariffsData } = useQuery({
    queryKey: ["finance", "tariffs"],
    queryFn: () => financeService.getTariffs(accessToken),
    enabled: isReady && Boolean(accessToken),
  });

  const subscriptionPackages = (tariffsData?.packages ?? []).filter((p) => p.active);

  const [migrateTarget, setMigrateTarget] = useState<TariffSubscriptionRow | null>(null);
  const [migratePackageId, setMigratePackageId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "tariff-subscriptions", statusFilter],
    queryFn: () =>
      financeService.getTariffSubscriptions(
        accessToken,
        statusFilter === "all" ? undefined : statusFilter,
      ),
    enabled: isReady && Boolean(accessToken) && hasPermission(PERMISSIONS.finance.subscriptionsRead),
  });

  const patchSub = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof financeService.patchTariffSubscription>[2];
    }) => financeService.patchTariffSubscription(accessToken, id, body),
    onSuccess: () => {
      toast.success(t("financeSubscribers.updated"));
      setActionTarget(null);
      setActionKind(null);
      void qc.invalidateQueries({ queryKey: ["finance", "tariff-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSub = useMutation({
    mutationFn: () =>
      financeService.createTariffSubscription(accessToken, {
        driver_id: driverId.trim(),
        tariff_package_id: packageId,
        notify: true,
      }),
    onSuccess: () => {
      toast.success(t("financeSubscribers.added"));
      setAddOpen(false);
      setDriverId("");
      setPackageId("");
      void qc.invalidateQueries({ queryKey: ["finance", "tariff-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const migrateSub = useMutation({
    mutationFn: () => {
      if (!migrateTarget) throw new Error("No subscription");
      return financeService.patchTariffSubscription(accessToken, migrateTarget.id, {
        action: "migrate",
        tariff_package_id: migratePackageId,
        notify: true,
      });
    },
    onSuccess: () => {
      toast.success(t("financeSubscribers.migrated"));
      setMigrateTarget(null);
      setMigratePackageId("");
      void qc.invalidateQueries({ queryKey: ["finance", "tariff-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSub = useMutation({
    mutationFn: (id: string) => financeService.deleteTariffSubscription(accessToken, id),
    onSuccess: () => {
      toast.success(t("financeSubscribers.deleted"));
      setActionTarget(null);
      setActionKind(null);
      void qc.invalidateQueries({ queryKey: ["finance", "tariff-subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRows = data?.subscriptions ?? [];

  const stats = useMemo(
    () => ({
      total: allRows.length,
      active: allRows.filter((r) => r.status === "active").length,
      held: allRows.filter((r) => r.status === "held").length,
    }),
    [allRows],
  );

  const rows = useMemo(() => {
    let listRows = [...allRows];
    if (list.search) {
      const q = list.search.toLowerCase();
      listRows = listRows.filter(
        (r) =>
          r.driver_email.toLowerCase().includes(q) ||
          r.tariff_name.toLowerCase().includes(q) ||
          r.driver_id.includes(q),
      );
    }
    const s = list.activeSort;
    if (s?.key === SORT_KEYS.email) {
      listRows.sort((a, b) => compareSortable(a.driver_email, b.driver_email, s.dir));
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
    resetDeps: [list.search, statusFilter],
  });

  function openAction(r: TariffSubscriptionRow, kind: FinanceNotifyActionKind) {
    setActionTarget(r);
    setActionKind(kind);
  }

  return (
    <>
      <AdminListStack>
        {canUpdate && (
          <div className="flex justify-end">
            <RyvoButton intent="cta" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {t("financeSubscribers.addManual")}
            </RyvoButton>
          </div>
        )}

        <AdminStatGrid>
          <AdminStatCard icon={Users} label={t("financeSubscribers.stats.total")} value={stats.total} />
          <AdminStatCard
            icon={Users}
            tone="success"
            label={t("financeSubscribers.stats.active")}
            value={stats.active}
          />
          <AdminStatCard label={t("financeSubscribers.stats.held")} value={stats.held} icon={Users} />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("financeSubscribers.search")}
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
                { value: "all", label: t("financePaychecks.all") },
                { value: "active", label: t("financeSubscribers.active") },
                { value: "held", label: t("financePaychecks.filterHeld") },
                { value: "cancelled", label: t("financePaychecks.filterCancelled") },
              ]}
            />
          }
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : (
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
                  <th className="px-5 py-3.5">{t("financePaychecks.col.tariffType")}</th>
                  <th className="px-5 py-3.5">{t("financeSubscribers.monthly")}</th>
                  <th className="px-5 py-3.5">{t("financePaychecks.col.status")}</th>
                  <th className="px-5 py-3.5">{t("financeSubscribers.started")}</th>
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((r) => (
                  <tr key={r.id} className="border-border hover:bg-muted/30 border-t">
                    <td className="px-5 py-3">
                      <UserTableCell
                        name={r.driver_email}
                        subId={shortUserId(r.driver_id)}
                        email={r.driver_email}
                      />
                    </td>
                    <td className="px-5 py-3">{r.tariff_name}</td>
                    <td className="px-5 py-3">
                      {r.subscription_monthly != null ? `$${r.subscription_monthly}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        variant={
                          r.status === "active" ? "success" : r.status === "held" ? "default" : "danger"
                        }
                      >
                        {r.status}
                      </StatusBadge>
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{formatLastSeen(r.started_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <InlineRowActions
                          onView={() => toast.message(r.hold_reason ?? r.tariff_name)}
                          onDelete={canUpdate ? () => openAction(r, "delete") : undefined}
                        />
                        {canUpdate && (
                          <RyvoButton
                            intent="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              setMigrateTarget(r);
                              setMigratePackageId(r.tariff_package_id);
                            }}
                          >
                            {t("financeSubscribers.migrate")}
                          </RyvoButton>
                        )}
                        {canUpdate && r.status === "active" && (
                          <>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
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
            ? t("financeSubscribers.holdTitle")
            : actionKind === "resume"
              ? t("financeSubscribers.resumeTitle")
              : actionKind === "cancel"
                ? t("financeSubscribers.cancelTitle")
                : t("financeSubscribers.deleteTitle")
        }
        description={
          actionKind === "hold"
            ? t("financeSubscribers.holdDesc")
            : actionKind === "resume"
              ? t("financeSubscribers.resumeDesc")
              : actionKind === "cancel"
                ? t("financeSubscribers.cancelDesc")
                : t("financeSubscribers.deleteDesc")
        }
        dangerous={actionKind === "delete"}
        requireReason={actionKind === "hold" || actionKind === "cancel"}
        confirmLabel={actionKind === "delete" ? t("actions.delete") : undefined}
        pending={patchSub.isPending || removeSub.isPending}
        onConfirm={({ reason, notify }) => {
          if (!actionTarget || !actionKind) return;
          if (actionKind === "delete") {
            removeSub.mutate(actionTarget.id);
            return;
          }
          patchSub.mutate({
            id: actionTarget.id,
            body: { action: actionKind, reason, notify },
          });
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financeSubscribers.addManual")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t("financePaychecks.driverId")}</Label>
              <Input value={driverId} onChange={(e) => setDriverId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("financeSubscribers.package")}</Label>
              <select
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="">{t("financeSubscribers.pickPackage")}</option>
                {subscriptionPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="cta"
              disabled={!driverId.trim() || !packageId || createSub.isPending}
              onClick={() => createSub.mutate()}
            >
              {t("financeSubscribers.addManual")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(migrateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setMigrateTarget(null);
            setMigratePackageId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financeSubscribers.migrateTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("financeSubscribers.migrateDesc", { email: migrateTarget?.driver_email })}
          </p>
          <div className="space-y-1">
            <Label>{t("financeSubscribers.package")}</Label>
            <select
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={migratePackageId}
              onChange={(e) => setMigratePackageId(e.target.value)}
            >
              {subscriptionPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setMigrateTarget(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton
              intent="cta"
              disabled={!migratePackageId || migrateSub.isPending}
              onClick={() => migrateSub.mutate()}
            >
              {t("financeSubscribers.migrate")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
