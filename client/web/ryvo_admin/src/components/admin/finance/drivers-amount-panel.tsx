"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, DollarSign, Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
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
  UserTableCell,
  shortUserId,
} from "@/components/admin/admin-list-ui";
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
import { financeService, type DriverEarningRow } from "@/services/finance.service";

export function DriversAmountPanel() {
  const { t } = useTranslation();
  const { accessToken, isReady } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const canUpdate = hasPermission(PERMISSIONS.finance.paychecksUpdate);
  const list = useListControls(SORT_KEYS.email);

  const [adjustTarget, setAdjustTarget] = useState<DriverEarningRow | null>(null);
  const [adjustMode, setAdjustMode] = useState<"delta" | "set">("delta");
  const [adjustValue, setAdjustValue] = useState("");
  const [payTarget, setPayTarget] = useState<DriverEarningRow | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "driver-earnings"],
    queryFn: () => financeService.getDriverEarnings(accessToken),
    enabled: isReady && Boolean(accessToken) && hasPermission(PERMISSIONS.finance.paychecksRead),
  });

  const adjust = useMutation({
    mutationFn: () => {
      if (!adjustTarget) throw new Error("No driver");
      const v = Number(adjustValue);
      if (Number.isNaN(v)) throw new Error("Invalid amount");
      return financeService.adjustDriverEarning(
        accessToken,
        adjustTarget.driver_id,
        adjustMode === "set" ? { balance: v } : { delta: v },
      );
    },
    onSuccess: () => {
      toast.success(t("financeDriversAmount.adjusted"));
      setAdjustTarget(null);
      setAdjustValue("");
      void qc.invalidateQueries({ queryKey: ["finance", "driver-earnings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payDriver = useMutation({
    mutationFn: () => {
      if (!payTarget) throw new Error("No driver");
      const amount = Number(payAmount);
      if (Number.isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      return financeService.queuePaycheckFromEarnings(accessToken, payTarget.driver_id, amount);
    },
    onSuccess: () => {
      toast.success(t("financeDriversAmount.paid"));
      setPayTarget(null);
      setPayAmount("");
      void qc.invalidateQueries({ queryKey: ["finance", "driver-earnings"] });
      void qc.invalidateQueries({ queryKey: ["finance", "paychecks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRows = data?.earnings ?? [];

  const stats = useMemo(
    () => ({
      drivers: allRows.length,
      totalBalance: allRows.reduce((s, r) => s + r.balance, 0),
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
          (r.tariff_name ?? "").toLowerCase().includes(q) ||
          r.driver_id.includes(q),
      );
    }
    const s = list.activeSort;
    if (s?.key === SORT_KEYS.email) {
      listRows.sort((a, b) => compareSortable(a.driver_email, b.driver_email, s.dir));
    } else if (s?.key === "balance") {
      listRows.sort((a, b) => compareSortable(a.balance, b.balance, s.dir));
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
    resetDeps: [list.search],
  });

  function renderRow(r: DriverEarningRow) {
    return (
      <>
        <td className="px-5 py-3">
          <UserTableCell
            name={r.driver_email}
            subId={shortUserId(r.driver_id)}
            email={r.driver_email}
          />
        </td>
        <td className="px-5 py-3 font-semibold">${r.balance.toFixed(2)}</td>
        <td className="px-5 py-3">{r.tariff_name ?? t("financeDriversAmount.noTariff")}</td>
        <td className="text-muted-foreground px-5 py-3">{formatLastSeen(r.updated_at)}</td>
        <td className="px-5 py-3">
          <div className="flex justify-end gap-1">
            {canUpdate && (
              <>
                <RyvoButton
                  intent="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    setAdjustTarget(r);
                    setAdjustMode("delta");
                    setAdjustValue("");
                  }}
                >
                  {t("financeDriversAmount.adjust")}
                </RyvoButton>
                <RyvoButton
                  intent="cta"
                  className="h-8 px-2 text-xs"
                  disabled={r.balance <= 0}
                  onClick={() => {
                    setPayTarget(r);
                    setPayAmount(String(r.balance));
                  }}
                >
                  <Banknote className="size-3.5" />
                  {t("financeDriversAmount.pay")}
                </RyvoButton>
              </>
            )}
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      <AdminListStack>
        <AdminStatGrid>
          <AdminStatCard icon={Wallet} label={t("financeDriversAmount.stats.drivers")} value={stats.drivers} />
          <AdminStatCard
            icon={DollarSign}
            tone="success"
            label={t("financeDriversAmount.stats.totalBalance")}
            value={`$${stats.totalBalance.toFixed(2)}`}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("financeDriversAmount.search")}
        />

        <ListLayoutToolbar
          layout={list.layout}
          onLayoutChange={list.setLayout}
          loadMode={list.loadMode}
          onLoadModeChange={list.setLoadMode}
          pageSize={list.pageSize}
          onPageSizeChange={list.setPageSize}
        />

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : list.layout === LIST_LAYOUT.grid ? (
          <EntityGrid>
            {pagination.visibleItems.map((r) => (
              <EntityGridCard key={r.driver_id}>
                <p className="font-semibold">{r.driver_email}</p>
                <p className="text-primary text-lg font-bold">${r.balance.toFixed(2)}</p>
                <p className="text-muted-foreground text-xs">{r.tariff_name ?? "—"}</p>
                {canUpdate && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <RyvoButton
                      intent="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        setAdjustTarget(r);
                        setAdjustMode("delta");
                        setAdjustValue("");
                      }}
                    >
                      <Plus className="size-3.5" />
                      {t("financeDriversAmount.adjust")}
                    </RyvoButton>
                    <RyvoButton
                      intent="cta"
                      className="h-8 text-xs"
                      disabled={r.balance <= 0}
                      onClick={() => {
                        setPayTarget(r);
                        setPayAmount(String(r.balance));
                      }}
                    >
                      {t("financeDriversAmount.pay")}
                    </RyvoButton>
                  </div>
                )}
              </EntityGridCard>
            ))}
          </EntityGrid>
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
                  <SortableTableHeader
                    label={t("financeDriversAmount.col.balance")}
                    sortKey="balance"
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("financePaychecks.col.tariffType")}</th>
                  <th className="px-5 py-3.5">{t("financeDriversAmount.col.updated")}</th>
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((r) => (
                  <tr key={r.driver_id} className="border-border hover:bg-muted/30 border-t">
                    {renderRow(r)}
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

      <Dialog open={Boolean(adjustTarget)} onOpenChange={(o) => !o && setAdjustTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financeDriversAmount.adjustTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <RyvoButton
                intent={adjustMode === "delta" ? "cta" : "outline"}
                className="flex-1"
                onClick={() => setAdjustMode("delta")}
              >
                {t("financeDriversAmount.modeDelta")}
              </RyvoButton>
              <RyvoButton
                intent={adjustMode === "set" ? "cta" : "outline"}
                className="flex-1"
                onClick={() => setAdjustMode("set")}
              >
                {t("financeDriversAmount.modeSet")}
              </RyvoButton>
            </div>
            <div className="space-y-1">
              <Label>{t("financeDriversAmount.amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setAdjustTarget(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton intent="cta" disabled={adjust.isPending} onClick={() => adjust.mutate()}>
              {t("common.save")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payTarget)} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("financeDriversAmount.payTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("financeDriversAmount.payDesc", {
              email: payTarget?.driver_email,
              balance: payTarget?.balance.toFixed(2),
            })}
          </p>
          <div className="space-y-1">
            <Label>{t("financeDriversAmount.payAmount")}</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={payTarget?.balance}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t("financeDriversAmount.payHint")}</p>
          </div>
          <DialogFooter>
            <RyvoButton intent="outline" onClick={() => setPayTarget(null)}>
              {t("common.cancel")}
            </RyvoButton>
            <RyvoButton intent="cta" disabled={payDriver.isPending} onClick={() => payDriver.mutate()}>
              {t("financeDriversAmount.pay")}
            </RyvoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
