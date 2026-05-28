"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CheckCircle2, Clock, CreditCard } from "lucide-react";

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
import { PaymentPreviewDialog } from "@/components/admin/finance/payment-preview-dialog";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { LIST_LAYOUT, PERMISSIONS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { adminService, type PaymentAdminRow } from "@/services/admin.service";

function paymentStatusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "succeeded") return "success";
  if (status === "pending" || status === "processing" || status === "requires_payment_method") {
    return "warning";
  }
  if (status === "failed" || status === "cancelled" || status === "canceled") return "danger";
  return "default";
}

export function PaymentsPanel() {
  const { t } = useTranslation();
  const { accessToken, isReady } = useAuth();
  const { hasPermission } = useRbac();
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<PaymentAdminRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const list = useListControls(SORT_KEYS.createdAt);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments", statusFilter],
    queryFn: () =>
      adminService.listPayments(accessToken, {
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 500,
      }),
    enabled: isReady && Boolean(accessToken) && hasPermission(PERMISSIONS.payments.read),
  });

  const allPayments = data?.payments ?? [];

  const stats = useMemo(() => {
    const succeeded = allPayments.filter((p) => p.status === "succeeded");
    const volume = succeeded.reduce((sum, p) => sum + p.amount, 0);
    const pending = allPayments.filter((p) => p.status !== "succeeded").length;
    return {
      total: allPayments.length,
      succeeded: succeeded.length,
      volume,
      pending,
    };
  }, [allPayments]);

  const payments = useMemo(() => {
    let rows = [...allPayments];
    if (list.search) {
      const q = list.search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.rider_email.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.provider_intent_id ?? "").toLowerCase().includes(q) ||
          (p.trip_id ?? "").toLowerCase().includes(q),
      );
    }
    const s = list.activeSort;
    if (s) {
      rows.sort((a, b) => {
        if (s.key === SORT_KEYS.email) return compareSortable(a.rider_email, b.rider_email, s.dir);
        if (s.key === SORT_KEYS.amount) return compareSortable(a.amount, b.amount, s.dir);
        if (s.key === SORT_KEYS.status) return compareSortable(a.status, b.status, s.dir);
        return compareSortable(a.created_at, b.created_at, s.dir);
      });
    }
    return rows;
  }, [allPayments, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(payments, {
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
    { value: `${SORT_KEYS.amount}:desc`, label: t("payments.sortAmountDesc") },
    { value: `${SORT_KEYS.amount}:asc`, label: t("payments.sortAmountAsc") },
    { value: `${SORT_KEYS.email}:asc`, label: t("list.sortEmailAsc") },
    { value: `${SORT_KEYS.email}:desc`, label: t("list.sortEmailDesc") },
  ];

  const statusOptions = [
    { value: "all", label: t("list.allStatuses") },
    { value: "succeeded", label: t("payments.statusSucceeded") },
    { value: "pending", label: t("payments.statusPending") },
    { value: "failed", label: t("payments.statusFailed") },
  ];

  function openPreview(p: PaymentAdminRow) {
    setPreview(p);
    setPreviewOpen(true);
  }

  return (
    <>
      <AdminListStack>
        <AdminStatGrid>
          <AdminStatCard
            icon={CreditCard}
            label={t("payments.stats.total")}
            value={stats.total}
            hint={t("payments.stats.totalHint")}
          />
          <AdminStatCard
            icon={CheckCircle2}
            tone="success"
            label={t("payments.stats.succeeded")}
            value={stats.succeeded}
            hint={
              stats.total
                ? `${Math.round((stats.succeeded / stats.total) * 100)}% ${t("list.ofTotal")}`
                : undefined
            }
          />
          <AdminStatCard
            icon={Banknote}
            tone="info"
            label={t("payments.stats.volume")}
            value={`$${stats.volume.toFixed(2)}`}
            hint={t("payments.stats.volumeHint")}
          />
          <AdminStatCard
            icon={Clock}
            tone="warning"
            label={t("payments.stats.other")}
            value={stats.pending}
            hint={t("payments.stats.otherHint")}
          />
        </AdminStatGrid>

        <AdminSearchToolbar
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("payments.search")}
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
            isEmpty={!payments.length}
            empty={
              <p className="text-muted-foreground px-4 py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <SortableTableHeader
                    label={t("payments.col.client")}
                    sortKey={SORT_KEYS.email}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("payments.col.amount")}
                    sortKey={SORT_KEYS.amount}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <SortableTableHeader
                    label={t("payments.col.status")}
                    sortKey={SORT_KEYS.status}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5">{t("payments.col.provider")}</th>
                  <th className="px-5 py-3.5">{t("payments.col.trip")}</th>
                  <SortableTableHeader
                    label={t("payments.col.created")}
                    sortKey={SORT_KEYS.createdAt}
                    activeSort={list.sort}
                    onSort={list.toggleColumnSort}
                  />
                  <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {pagination.visibleItems.map((p) => (
                  <tr key={p.id} className="border-border hover:bg-muted/30 border-t transition">
                    <td className="px-5 py-3">
                      <UserTableCell
                        name={p.rider_email}
                        subId={shortUserId(p.rider_id)}
                        email={p.rider_email}
                      />
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {p.amount} {p.currency}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>
                    </td>
                    <td className="text-muted-foreground px-5 py-3 text-xs uppercase">{p.provider}</td>
                    <td className="text-muted-foreground px-5 py-3 font-mono text-xs">
                      {p.trip_id ? shortUserId(p.trip_id) : "—"}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">{formatLastSeen(p.created_at)}</td>
                    <td className="px-5 py-3">
                      <InlineRowActions onView={() => openPreview(p)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        ) : (
          <EntityGrid
            isEmpty={!payments.length}
            empty={
              <p className="text-muted-foreground py-12 text-center text-sm">{t("common.noData")}</p>
            }
          >
            {pagination.visibleItems.map((p) => (
              <EntityGridCard key={p.id} onClick={() => openPreview(p)}>
                <UserTableCell
                  name={p.rider_email}
                  subId={shortUserId(p.rider_id)}
                  email={p.rider_email}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>
                  <span className="text-sm font-semibold">
                    {p.amount} {p.currency}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {p.provider} · {formatLastSeen(p.created_at)}
                </p>
                <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <InlineRowActions onView={() => openPreview(p)} />
                </div>
              </EntityGridCard>
            ))}
          </EntityGrid>
        )}

        {!isLoading && payments.length > 0 && (
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

      <PaymentPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} payment={preview} />
    </>
  );
}
