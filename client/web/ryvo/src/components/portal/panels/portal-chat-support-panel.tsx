"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { formatLastSeen } from "@/lib/format-date";
import { supportService, type SupportTicket } from "@/services/support.service";

export function PortalChatSupportPanel() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const ticketsQ = useQuery({
    queryKey: ["portal", "tickets", user?.id],
    queryFn: () => supportService.listTickets(accessToken),
    enabled: Boolean(accessToken),
  });

  const myTickets = useMemo(() => {
    if (!user?.id) return [];
    return (ticketsQ.data?.tickets ?? []).filter((tk) => tk.user_id === user.id);
  }, [ticketsQ.data?.tickets, user?.id]);

  const selected = myTickets.find((t) => t.id === selectedId) ?? null;

  const messagesQ = useQuery({
    queryKey: ["portal", "ticket-messages", selectedId],
    queryFn: () => supportService.listMessages(accessToken, selectedId!),
    enabled: Boolean(accessToken) && Boolean(selectedId),
  });

  const sendReply = useMutation({
    mutationFn: () => supportService.postMessage(accessToken, selectedId!, reply),
    onSuccess: () => {
      setReply("");
      void qc.invalidateQueries({ queryKey: ["portal", "ticket-messages", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const created = await supportService.createTicket(accessToken, {
        subject,
        category: "complaint",
      });
      if (body.trim()) {
        await supportService.postMessage(accessToken, created.ticket.id, body, {
          message_kind: "user",
        });
      }
      return created;
    },
    onSuccess: (res) => {
      toast.success(t("portal.support.created"));
      setSubject("");
      setBody("");
      setSelectedId(res.ticket.id);
      void qc.invalidateQueries({ queryKey: ["portal", "tickets", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="border-border space-y-2 rounded-2xl border p-3">
        <p className="text-sm font-semibold">{t("portal.support.myTickets")}</p>
        <ScrollArea className="h-[320px] pr-2">
          {myTickets.map((tk) => (
            <button
              key={tk.id}
              type="button"
              onClick={() => setSelectedId(tk.id)}
              className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${
                selectedId === tk.id ? "bg-primary/15" : "hover:bg-muted"
              }`}
            >
              <p className="font-medium">{tk.subject}</p>
              <p className="text-muted-foreground text-xs">{tk.status}</p>
            </button>
          ))}
          {myTickets.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-xs">{t("common.noData")}</p>
          ) : null}
        </ScrollArea>
      </div>

      <div className="space-y-4">
        {selected ? (
          <>
            <div>
              <h3 className="font-semibold">{selected.subject}</h3>
              <p className="text-muted-foreground text-xs">
                {selected.status} · {formatLastSeen(selected.created_at)}
              </p>
            </div>
            <ScrollArea className="border-border h-[240px] rounded-2xl border p-3">
              {(messagesQ.data?.messages ?? []).map((m) => (
                <div key={m.id} className="mb-3 text-sm">
                  <p className="text-muted-foreground text-xs">{formatLastSeen(m.created_at)}</p>
                  <p>{m.body}</p>
                </div>
              ))}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("portal.support.replyPlaceholder")}
              />
              <RyvoButton
                intent="cta"
                disabled={!reply.trim() || sendReply.isPending}
                onClick={() => sendReply.mutate()}
              >
                {t("portal.support.send")}
              </RyvoButton>
            </div>
          </>
        ) : (
          <div className="border-border space-y-3 rounded-2xl border p-4">
            <p className="font-semibold">{t("portal.support.newTicket")}</p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("portal.support.subjectPlaceholder")}
            />
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("portal.support.messagePlaceholder")}
            />
            <RyvoButton
              intent="cta"
              disabled={!subject.trim() || !body.trim() || createTicket.isPending}
              onClick={() => createTicket.mutate()}
            >
              {t("portal.support.create")}
            </RyvoButton>
          </div>
        )}
      </div>
    </div>
  );
}
