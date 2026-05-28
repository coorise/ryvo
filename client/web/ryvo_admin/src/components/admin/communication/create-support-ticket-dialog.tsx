"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { UserTableCell } from "@/components/admin/admin-list-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_TABS, ADMIN_USER_KIND, PERMISSIONS, QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import {
  insertAtCursor,
  renderMessagePreview,
  tokensForAudience,
  type MessageAudience,
} from "@/lib/message-template";
import { cn } from "@/lib/utils";
import { rbacService, type AdminUserRow } from "@/services/rbac.service";
import { supportService } from "@/services/support.service";

type CreateSupportTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: "clients" | "drivers";
  onCreated: (ticketId: string) => void;
};

export function CreateSupportTicketDialog({
  open,
  onOpenChange,
  audience,
  onCreated,
}: CreateSupportTicketDialogProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const kind = audience === ADMIN_TABS.chatSupport.drivers ? ADMIN_USER_KIND.drivers : ADMIN_USER_KIND.clients;
  const canListUsers =
    kind === ADMIN_USER_KIND.drivers
      ? hasPermission(PERMISSIONS.drivers.read)
      : hasPermission(PERMISSIONS.users.read);

  const usersQ = useQuery({
    queryKey: QUERY_KEYS.admin.users(kind),
    queryFn: () => rbacService.listUsers(accessToken, kind),
    enabled: Boolean(accessToken) && open && canListUsers,
  });

  const filteredUsers = useMemo(() => {
    const all = (usersQ.data?.users ?? []).filter((u) => !u.banned_at && !u.deleted_at);
    const q = userSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [usersQ.data?.users, userSearch]);

  const messageAudience: MessageAudience =
    audience === ADMIN_TABS.chatSupport.drivers ? "drivers" : "clients";
  const tokens = useMemo(() => tokensForAudience(messageAudience), [messageAudience]);

  const create = useMutation({
    mutationFn: () =>
      supportService.createAdminTicket(accessToken, {
        user_id: selectedUserId!,
        subject: subject.trim(),
        message: message.trim(),
        audience: messageAudience,
      }),
    onSuccess: (res) => {
      toast.success(t("communication.chatSupport.ticketCreated"));
      void qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      onCreated(res.ticket.id);
      onOpenChange(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setUserSearch("");
    setSelectedUserId(null);
    setSubject("");
    setMessage("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  const selectedUser = filteredUsers.find((u) => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
          <DialogTitle>{t("communication.chatSupport.createTicketTitle")}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {audience === ADMIN_TABS.chatSupport.drivers
              ? t("communication.chatSupport.createTicketSubtitleDrivers")
              : t("communication.chatSupport.createTicketSubtitleClients")}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label>{t("communication.chatSupport.selectUser")}</Label>
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t("communication.chatSupport.searchUserPlaceholder")}
              className="rounded-full"
            />
            {!canListUsers ? (
              <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
            ) : usersQ.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
            ) : (
              <ScrollArea className="border-border h-40 rounded-2xl border">
                <div className="divide-border divide-y">
                  {filteredUsers.map((u) => (
                    <UserRowButton
                      key={u.id}
                      user={u}
                      selected={selectedUserId === u.id}
                      onSelect={() => setSelectedUserId(u.id)}
                    />
                  ))}
                  {!filteredUsers.length && (
                    <p className="text-muted-foreground p-4 text-center text-sm">
                      {t("communication.chatSupport.noUsersMatch")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
            {selectedUser && (
              <p className="text-muted-foreground text-xs">
                {t("communication.chatSupport.selectedUser")}:{" "}
                <span className="text-foreground font-medium">
                  {selectedUser.full_name ?? selectedUser.email}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-subject">{t("communication.chatSupport.subject")}</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("communication.chatSupport.subjectPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-message">{t("communication.messages.body")}</Label>
            <div className="flex flex-wrap gap-2">
              <span className="text-muted-foreground text-xs">{t("communication.messages.templates")}</span>
              {tokens.map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => insertAtCursor(message, tok, textareaRef.current, setMessage)}
                  className="bg-muted text-muted-foreground hover:text-foreground rounded-xl px-2.5 py-1 text-[11px] font-semibold transition"
                >
                  {tok}
                </button>
              ))}
            </div>
            <Textarea
              id="ticket-message"
              ref={textareaRef}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("communication.chatSupport.messagePlaceholder")}
            />
            <div className="border-border bg-muted/30 rounded-2xl border p-3">
              <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {t("communication.messages.preview")}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">
                {renderMessagePreview(message || t("communication.messages.previewEmpty"))}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-border shrink-0 border-t px-6 py-4">
          <RyvoButton intent="outline" type="button" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </RyvoButton>
          <RyvoButton
            intent="cta"
            disabled={
              !selectedUserId || !subject.trim() || !message.trim() || create.isPending
            }
            onClick={() => create.mutate()}
          >
            {t("communication.chatSupport.sendAndOpen")}
          </RyvoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowButton({
  user,
  selected,
  onSelect,
}: {
  user: AdminUserRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "hover:bg-muted/50 w-full px-3 py-2.5 text-left transition",
        selected && "bg-primary/10 ring-primary ring-1 ring-inset",
      )}
    >
      <UserTableCell
        name={user.full_name ?? user.email}
        email={user.email}
        subId={user.id.slice(0, 8)}
      />
    </button>
  );
}
