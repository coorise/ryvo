"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Mail, MessageSquare, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  InlineRowActions,
  SortableTableHeader,
  StatusBadge,
  UpdatedByCell,
} from "@/components/admin/admin-list-ui";
import { DeleteEntityDialog } from "@/components/admin/delete-entity-dialog";
import { ListLayoutToolbar } from "@/components/admin/list-layout-toolbar";
import { ListPaginationFooter } from "@/components/admin/list-pagination-footer";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LIST_LAYOUT, PERMISSIONS, QUERY_KEYS, ROUTES, SORT_KEYS } from "@/configs/const";
import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";
import { compareSortable, useListControls } from "@/hooks/use-list-controls";
import { usePaginatedSlice } from "@/hooks/use-paginated-slice";
import { renderMessagePreview } from "@/lib/message-template";
import { cn } from "@/lib/utils";
import { messagesService, type AdminMessageCampaign } from "@/services/messages.service";

function statusVariant(status: AdminMessageCampaign["status"]) {
  if (status === "sent") return "success" as const;
  if (status === "queued") return "info" as const;
  if (status === "draft") return "warning" as const;
  return "danger" as const;
}

function channelsLabel(c: AdminMessageCampaign, t: (k: string) => string) {
  const parts: string[] = [];
  if (c.send_push) parts.push(t("communication.messages.sendPush"));
  if (c.send_email) parts.push(t("communication.messages.sendEmail"));
  return parts.length ? parts.join(" · ") : "—";
}

export default function CommunicationMessagesPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const list = useListControls(SORT_KEYS.createdAt);
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all_audiences");
  const [preview, setPreview] = useState<AdminMessageCampaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMessageCampaign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.messageCampaigns,
    queryFn: () => messagesService.list(accessToken),
    enabled: Boolean(accessToken),
  });

  const all = data?.campaigns ?? [];

  const stats = useMemo(() => {
    return {
      total: all.length,
      drafts: all.filter((c) => c.status === "draft").length,
      sent: all.filter((c) => c.status === "sent").length,
      queued: all.filter((c) => c.status === "queued").length,
    };
  }, [all]);

  const rows = useMemo(() => {
    let items = all.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (audienceFilter === "clients" && c.audience !== "clients") return false;
      if (audienceFilter === "drivers" && c.audience !== "drivers") return false;
      if (audienceFilter === "everyone" && c.audience !== "all") return false;
      if (!list.search) return true;
      const q = list.search.toLowerCase();
      return (
        c.body_template.toLowerCase().includes(q) ||
        c.audience.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
    const s = list.activeSort;
    if (s) {
      items = [...items].sort((a, b) => {
        if (s.key === SORT_KEYS.createdAt) {
          return compareSortable(a.created_at, b.created_at, s.dir);
        }
        if (s.key === SORT_KEYS.status) {
          return compareSortable(a.status, b.status, s.dir);
        }
        return compareSortable(a.body_template, b.body_template, s.dir);
      });
    }
    return items;
  }, [all, statusFilter, audienceFilter, list.search, list.activeSort]);

  const pagination = usePaginatedSlice(rows, {
    pageSize: list.pageSize,
    loadMode: list.loadMode,
    page: list.page,
    setPage: list.setPage,
    infinitePages: list.infinitePages,
    setInfinitePages: list.setInfinitePages,
    resetDeps: [list.search, list.activeSort, statusFilter, audienceFilter],
  });

  const remove = useMutation({
    mutationFn: (id: string) => messagesService.remove(accessToken, id),
    onSuccess: () => {
      toast.success(t("communication.messages.deleted"));
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.messageCampaigns });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendDraft = useMutation({
    mutationFn: (id: string) => messagesService.send(accessToken, id),
    onSuccess: () => {
      toast.success(t("communication.messages.sent"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.messageCampaigns });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: (id: string) => messagesService.resend(accessToken, id),
    onSuccess: () => {
      toast.success(t("communication.messages.resent"));
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.messageCampaigns });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function renderActions(c: AdminMessageCampaign) {
    const isDraft = c.status === "draft";
    const isSent = c.status === "sent";
    return (
      <InlineRowActions
        onView={() => setPreview(c)}
        onEdit={
          isDraft || c.status === "queued"
            ? () => router.push(ROUTES.admin.communication.messageEdit(c.id))
            : undefined
        }
        onRemind={
          isDraft
            ? () => sendDraft.mutate(c.id)
            : isSent
              ? () => resend.mutate(c.id)
              : undefined
        }
        remindLabel={
          isDraft ? t("communication.messages.sendNow") : t("communication.messages.resend")
        }
        onDelete={() => setDeleteTarget(c)}
      />
    );
  }

  return (
    <PermissionGate
      permissions={[PERMISSIONS.communication.messagesRead, PERMISSIONS.support.reply]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <div className="space-y-6">
        <AdminPageHeader
          title={t("nav.messages")}
          subtitle={t("communication.messages.listSubtitle")}
          action={
            <Link href={ROUTES.admin.communication.messagesNew}>
              <RyvoButton intent="cta">{t("communication.messages.create")}</RyvoButton>
            </Link>
          }
        />

        <AdminListStack>
          <AdminStatGrid>
            <AdminStatCard
              icon={MessageSquare}
              label={t("communication.messages.stats.total")}
              value={stats.total}
            />
            <AdminStatCard
              icon={FileText}
              tone="warning"
              label={t("communication.messages.stats.drafts")}
              value={stats.drafts}
            />
            <AdminStatCard
              icon={Send}
              tone="success"
              label={t("communication.messages.stats.sent")}
              value={stats.sent}
            />
            <AdminStatCard
              icon={Clock}
              tone="info"
              label={t("communication.messages.stats.queued")}
              value={stats.queued}
            />
          </AdminStatGrid>

          <AdminSearchToolbar
            value={list.search}
            onChange={list.setSearch}
            placeholder={t("communication.messages.historySearch")}
          />

          <ListLayoutToolbar
            layout={list.layout}
            onLayoutChange={list.setLayout}
            loadMode={list.loadMode}
            onLoadModeChange={list.setLoadMode}
            pageSize={list.pageSize}
            onPageSizeChange={list.setPageSize}
            filters={
              <>
                <AdminFilterSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: t("list.allStatuses") },
                    { value: "draft", label: t("communication.messages.status.draft") },
                    { value: "queued", label: t("communication.messages.status.queued") },
                    { value: "sent", label: t("communication.messages.status.sent") },
                    { value: "cancelled", label: t("communication.messages.status.cancelled") },
                  ]}
                />
                <AdminFilterSelect
                  value={audienceFilter}
                  onChange={setAudienceFilter}
                  options={[
                    { value: "all_audiences", label: t("communication.messages.audienceAll") },
                    { value: "clients", label: t("communication.messages.audience_clients") },
                    { value: "drivers", label: t("communication.messages.audience_drivers") },
                    { value: "everyone", label: t("communication.messages.audience_all") },
                  ]}
                />
              </>
            }
          />

          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : list.layout === LIST_LAYOUT.table ? (
            <AdminTableCard
              isEmpty={!rows.length}
              empty={
                <p className="text-muted-foreground px-4 py-12 text-center text-sm">
                  {t("communication.messages.historyEmpty")}
                </p>
              }
            >
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <th className="px-5 py-3.5">{t("communication.messages.col.message")}</th>
                    <th className="px-5 py-3.5">{t("communication.messages.audience")}</th>
                    <th className="px-5 py-3.5">{t("communication.messages.col.channels")}</th>
                    <SortableTableHeader
                      label={t("list.columnStatus")}
                      sortKey={SORT_KEYS.status}
                      activeSort={list.sort}
                      onSort={list.toggleColumnSort}
                    />
                    <SortableTableHeader
                      label={t("communication.messages.col.created")}
                      sortKey={SORT_KEYS.createdAt}
                      activeSort={list.sort}
                      onSort={list.toggleColumnSort}
                    />
                    <th className="px-5 py-3.5">{t("list.updatedBy")}</th>
                    <th className="px-5 py-3.5 text-right">{t("users.actions")}</th>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {pagination.visibleItems.map((c) => (
                    <tr key={c.id} className="border-border hover:bg-muted/30 border-t transition">
                      <td className="max-w-md px-5 py-3">
                        <p className="line-clamp-2 text-sm font-medium">{c.body_template}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          {renderMessagePreview(c.body_template)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant="info">
                          {t(`communication.messages.audience_${c.audience}`)}
                        </StatusBadge>
                      </td>
                      <td className="text-muted-foreground px-5 py-3 text-sm">
                        {channelsLabel(c, t)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant={statusVariant(c.status)}>
                          {t(`communication.messages.status.${c.status}`)}
                        </StatusBadge>
                      </td>
                      <td className="text-muted-foreground px-5 py-3 text-sm">
                        {new Date(c.created_at).toLocaleString()}
                        {c.last_sent_at ? (
                          <span className="mt-0.5 block text-xs">
                            {t("communication.messages.lastSent")}:{" "}
                            {new Date(c.last_sent_at).toLocaleString()}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <UpdatedByCell email={c.updated_by_email} />
                      </td>
                      <td className="px-5 py-3">{renderActions(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pagination.visibleItems.map((c) => (
                <div
                  key={c.id}
                  className="border-border bg-card space-y-3 rounded-3xl border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={statusVariant(c.status)}>
                      {t(`communication.messages.status.${c.status}`)}
                    </StatusBadge>
                    <StatusBadge variant="info">
                      {t(`communication.messages.audience_${c.audience}`)}
                    </StatusBadge>
                  </div>
                  <p className="line-clamp-3 text-sm">{c.body_template}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Mail className="size-3" />
                    {channelsLabel(c, t)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  <div className="flex justify-end">{renderActions(c)}</div>
                </div>
              ))}
              {!pagination.visibleItems.length && (
                <p className="text-muted-foreground col-span-full py-12 text-center text-sm">
                  {t("communication.messages.historyEmpty")}
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
        </AdminListStack>
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("communication.messages.previewTitle")}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant={statusVariant(preview.status)}>
                  {t(`communication.messages.status.${preview.status}`)}
                </StatusBadge>
                <StatusBadge variant="info">
                  {t(`communication.messages.audience_${preview.audience}`)}
                </StatusBadge>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm">{preview.body_template}</p>
              <div className={cn("border-border bg-muted/30 rounded-2xl border p-4")}>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t("communication.messages.preview")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {renderMessagePreview(preview.body_template)}
                </p>
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
            ? [{ id: deleteTarget.id, label: deleteTarget.body_template.slice(0, 80) }]
            : []
        }
        allowSoftDelete={false}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id);
        }}
      />
    </PermissionGate>
  );
}
