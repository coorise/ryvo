"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Inbox, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "@/components/admin/admin-list-ui";
import { DeleteEntityDialog } from "@/components/admin/delete-entity-dialog";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LIST_LAYOUT, QUERY_KEYS, SORT_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { formatLastSeen } from "@/lib/format-date";
import { notificationBody, notificationPreview, notificationTitle } from "@/lib/notification-content";
import { cn } from "@/lib/utils";
import { notificationService, type InboxNotification } from "@/services/notification.service";

export function NotificationsInboxPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const list = useListControls(SORT_KEYS.createdAt);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [detail, setDetail] = useState<InboxNotification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InboxNotification | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.notificationsInbox,
    queryFn: () => notificationService.getInbox(accessToken),
    enabled: Boolean(accessToken),
  });

  const all = data?.notifications ?? [];

  const stats = useMemo(() => {
    const unread = all.filter((n) => !n.read_at).length;
    return { total: all.length, unread, read: all.length - unread };
  }, [all]);

  const rows = useMemo(() => {
    let items = all.filter((n) => {
      if (statusFilter === "unread" && n.read_at) return false;
      if (statusFilter === "read" && !n.read_at) return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      const body = notificationPreview(n, 500).toLowerCase();
      return (
        n.type.toLowerCase().includes(q) ||
        n.channel.toLowerCase().includes(q) ||
        body.includes(q)
      );
    });
    const s = list.activeSort;
    if (s) {
      items = [...items].sort((a, b) => {
        if (s.key === SORT_KEYS.createdAt) {
          return compareSortable(a.created_at, b.created_at, s.dir);
        }
        if (s.key === SORT_KEYS.status) {
          const sa = a.read_at ? "read" : "unread";
          const sb = b.read_at ? "read" : "unread";
          return compareSortable(sa, sb, s.dir);
        }
        return compareSortable(a.type, b.type, s.dir);
      });
    }
    return items;
  }, [all, statusFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(rows, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter],
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.notificationsInbox });
    void qc.invalidateQueries({ queryKey: ["notifications", "inbox"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markRead(accessToken, id),
    onSuccess: (res) => {
      invalidate();
      if (detail?.id === res.id) {
        setDetail(res.notification);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationService.remove(accessToken, id),
    onSuccess: (_res, id) => {
      toast.success(t("communication.notifications.deleted"));
      setDeleteTarget(null);
      setDetail((d) => (d?.id === id ? null : d));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openDetail(n: InboxNotification) {
    setDetail(n);
    if (!n.read_at) markRead.mutate(n.id);
  }

  function renderActions(n: InboxNotification) {
    return (
      <InlineRowActions
        onView={() => openDetail(n)}
        onDelete={() => setDeleteTarget(n)}
      />
    );
  }

  return (
    <AdminListStack>
      <AdminStatGrid>
        <AdminStatCard icon={Inbox} label={t("communication.notifications.stats.total")} value={stats.total} />
        <AdminStatCard
          icon={Bell}
          tone="info"
          label={t("communication.notifications.stats.unread")}
          value={stats.unread}
        />
        <AdminStatCard
          icon={BellOff}
          tone="success"
          label={t("communication.notifications.stats.read")}
          value={stats.read}
        />
        <AdminStatCard
          icon={Mail}
          tone="neutral"
          label={t("communication.notifications.stats.inApp")}
          value={all.filter((n) => n.channel === "in_app").length}
        />
      </AdminStatGrid>

      <AdminSearchToolbar
        value={list.search}
        onChange={list.setSearch}
        placeholder={t("communication.notifications.searchPlaceholder")}
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
            onChange={(v) => setStatusFilter(v as "all" | "unread" | "read")}
            options={[
              { value: "all", label: t("list.allStatuses") },
              { value: "unread", label: t("communication.notifications.unread") },
              { value: "read", label: t("communication.notifications.read") },
            ]}
          />
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : list.layout === LIST_LAYOUT.table ? (
        <AdminTableCard
          isEmpty={!rows.length}
          empty={
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">
              {t("communication.notifications.empty")}
            </p>
          }
        >
          <AdminTable>
            <AdminTableHead>
              <tr>
                <SortableTableHeader
                  label={t("communication.notifications.col.when")}
                  sortKey={SORT_KEYS.createdAt}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("communication.notifications.col.type")}</th>
                <th className="px-5 py-3.5">{t("communication.notifications.col.channel")}</th>
                <SortableTableHeader
                  label={t("communication.notifications.col.status")}
                  sortKey={SORT_KEYS.status}
                  activeSort={list.sort}
                  onSort={list.toggleColumnSort}
                />
                <th className="px-5 py-3.5">{t("communication.notifications.col.message")}</th>
                <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
              </tr>
            </AdminTableHead>
            <tbody>
              {pagination.visibleItems.map((n) => (
                <tr
                  key={n.id}
                  className={cn(
                    "border-border hover:bg-muted/30 cursor-pointer border-t transition",
                    !n.read_at && "bg-primary/5",
                  )}
                  onClick={() => openDetail(n)}
                >
                  <td className="text-muted-foreground px-5 py-3 text-xs whitespace-nowrap">
                    {formatLastSeen(n.created_at)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{notificationTitle(n)}</td>
                  <td className="px-5 py-3 uppercase">{n.channel}</td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={n.read_at ? "default" : "info"}>
                      {n.read_at
                        ? t("communication.notifications.read")
                        : t("communication.notifications.unread")}
                    </StatusBadge>
                  </td>
                  <td className="text-muted-foreground max-w-md px-5 py-3 text-sm">
                    {notificationPreview(n)}
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    {renderActions(n)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pagination.visibleItems.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openDetail(n)}
              className={cn(
                "border-border bg-card space-y-2 rounded-3xl border p-4 text-left transition hover:border-primary/40",
                !n.read_at && "ring-primary/30 ring-1",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <StatusBadge variant={n.read_at ? "default" : "info"}>
                  {n.read_at
                    ? t("communication.notifications.read")
                    : t("communication.notifications.unread")}
                </StatusBadge>
                <span className="text-muted-foreground text-xs">{formatLastSeen(n.created_at)}</span>
              </div>
              <p className="font-mono text-xs">{notificationTitle(n)}</p>
              <p className="line-clamp-2 text-sm">{notificationPreview(n)}</p>
              <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                {renderActions(n)}
              </div>
            </button>
          ))}
          {!pagination.visibleItems.length && (
            <p className="text-muted-foreground col-span-full py-12 text-center text-sm">
              {t("communication.notifications.empty")}
            </p>
          )}
        </div>
      )}

      {rows.length > 0 && (
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

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail ? notificationTitle(detail) : ""}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={detail.read_at ? "default" : "info"}>
                  {detail.read_at
                    ? t("communication.notifications.read")
                    : t("communication.notifications.unread")}
                </StatusBadge>
                <StatusBadge>{detail.channel}</StatusBadge>
                <span className="text-muted-foreground text-xs">
                  {new Date(detail.created_at).toLocaleString()}
                </span>
              </div>
              <div className="border-border bg-muted/30 rounded-2xl border p-4">
                <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
                  {t("communication.notifications.detailBody")}
                </p>
                <p className="whitespace-pre-wrap text-sm">{notificationBody(detail)}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        targets={
          deleteTarget
            ? [
                {
                  id: deleteTarget.id,
                  label: notificationPreview(deleteTarget, 60),
                },
              ]
            : []
        }
        allowSoftDelete={false}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </AdminListStack>
  );
}
