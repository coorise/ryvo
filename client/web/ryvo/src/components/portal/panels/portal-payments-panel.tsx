"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AdminFilterSelect,
  AdminListStack,
  AdminStatCard,
  AdminStatGrid,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  SortableTableHeader,
  StatusBadge,
} from "@/components/admin/admin-list-ui";
import { PaymentPreviewDialog } from "@/components/admin/finance/payment-preview-dialog";
import { SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import type { PaymentAdminRow } from "@/services/admin.service";
import { portalService } from "@/services/portal.service";

function paymentStatusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "succeeded") return "success";
  if (status === "pending" || status === "processing") return "warning";
  if (status === "failed" || status === "cancelled" || status === "canceled") return "danger";
  return "default";
}

export function PortalPaymentsPanel() {
  const { t } = useTranslation();
  const { accessToken, user, isReady } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<PaymentAdminRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const list = useListControls(SORT_KEYS.createdAt);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", "payments", statusFilter, user?.id],
    queryFn: () =>
      portalService.listMyPayments(accessToken, {
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 500,
      }),
    enabled: isReady && Boolean(accessToken) && Boolean(user?.id),
    retry: false,
  });

  const allPayments = useMemo(() => data?.payments ?? [], [data?.payments]);

  const stats = useMemo(() => {
    const succeeded = allPayments.filter((p) => p.status === "succeeded");
    const volume = succeeded.reduce((sum, p) => sum + p.amount, 0);
    return { total: allPayments.length, volume, pending: allPayments.length - succeeded.length };
  }, [allPayments]);

  const rows = useMemo(() => {
    let items = [...allPayments];
    const s = list.activeSort;
    if (s?.key === SORT_KEYS.createdAt) {
      items.sort((a, b) => compareSortable(a.created_at, b.created_at, s.dir));
    }
    return items;
  }, [allPayments, list.activeSort]);

  const pagination = usePaginatedSlice(rows, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [statusFilter, list.activeSort],
  });

  return (
    <AdminListStack>
      {isError ? (
        <p className="text-muted-foreground text-sm">{t("portal.payments.unavailable")}</p>
      ) : (
        <>
          <AdminStatGrid>
            <AdminStatCard
              icon={Banknote}
              label={t("portal.payments.stats.total")}
              value={String(stats.total)}
            />
            <AdminStatCard
              icon={CheckCircle2}
              label={t("portal.payments.stats.volume")}
              value={`$${stats.volume.toFixed(2)}`}
            />
            <AdminStatCard
              icon={Clock}
              label={t("portal.payments.stats.pending")}
              value={String(stats.pending)}
            />
          </AdminStatGrid>
          <div className="flex flex-wrap gap-2">
            <AdminFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: t("portal.payments.filters.all") },
                { value: "succeeded", label: t("portal.payments.filters.succeeded") },
                { value: "pending", label: t("portal.payments.filters.pending") },
                { value: "failed", label: t("portal.payments.filters.failed") },
              ]}
            />
          </div>
          <AdminTableCard>
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <SortableTableHeader
                    label={t("portal.payments.columns.date")}
                    sortKey={SORT_KEYS.createdAt}
                    activeSort={list.activeSort}
                    onSort={list.toggleColumnSort}
                  />
                  <th>{t("portal.payments.columns.amount")}</th>
                  <th>{t("portal.payments.columns.status")}</th>
                </tr>
              </AdminTableHead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : pagination.visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  pagination.visibleItems.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setPreview(p);
                        setPreviewOpen(true);
                      }}
                    >
                      <td className="text-sm">{formatLastSeen(p.created_at)}</td>
                      <td className="text-sm font-medium">
                        ${p.amount.toFixed(2)} {p.currency.toUpperCase()}
                      </td>
                      <td>
                        <StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableCard>
          <PaymentPreviewDialog
            payment={preview}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />
        </>
      )}
    </AdminListStack>
  );
}
