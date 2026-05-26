"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_TABS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";
import { supportService, type SupportTicket } from "@/services/support.service";

function ticketAudience(ticket: SupportTicket): "clients" | "drivers" {
  const cat = ticket.category.toLowerCase();
  if (cat.includes("driver")) return "drivers";
  if (cat.includes("client") || cat.includes("rider") || cat.includes("passenger")) {
    return "clients";
  }
  return "clients";
}

type ChatSupportPanelProps = {
  tab: string;
  onTabChange: (v: string) => void;
};

export function ChatSupportPanel({ tab, onTabChange }: ChatSupportPanelProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const tickets = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => supportService.listTickets(accessToken),
    enabled: Boolean(accessToken) && hasPermission("support:reply"),
  });

  const filteredTickets = useMemo(() => {
    const all = tickets.data?.tickets ?? [];
    if (tab === ADMIN_TABS.chatSupport.drivers) {
      return all.filter((tk) => ticketAudience(tk) === "drivers");
    }
    return all.filter((tk) => ticketAudience(tk) === "clients");
  }, [tickets.data?.tickets, tab]);

  const messages = useQuery({
    queryKey: ["admin", "tickets", selectedId, "messages"],
    queryFn: () => supportService.listMessages(accessToken, selectedId!),
    enabled: Boolean(accessToken && selectedId),
  });

  const send = useMutation({
    mutationFn: () => supportService.postMessage(accessToken, selectedId!, reply),
    onSuccess: () => {
      setReply("");
      toast.success(t("tickets.sent"));
      void qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value={ADMIN_TABS.chatSupport.clients}>{t("nav.users")}</TabsTrigger>
        <TabsTrigger value={ADMIN_TABS.chatSupport.drivers}>{t("nav.driverKyc")}</TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border-border bg-card max-h-[70vh] overflow-y-auto rounded-3xl border">
            {filteredTickets.map((tk) => (
              <button
                key={tk.id}
                type="button"
                onClick={() => setSelectedId(tk.id)}
                className={cn(
                  "border-border w-full border-b px-4 py-3 text-left transition hover:bg-muted/50",
                  selectedId === tk.id && "bg-muted",
                )}
              >
                <p className="text-sm font-semibold">{tk.subject}</p>
                <p className="text-muted-foreground text-xs">
                  {tk.category} · {tk.status} · {new Date(tk.created_at).toLocaleString()}
                </p>
              </button>
            ))}
            {!filteredTickets.length && (
              <p className="text-muted-foreground p-6 text-sm">{t("common.noData")}</p>
            )}
          </div>
          <div className="border-border bg-card flex flex-col rounded-3xl border p-4">
            {selectedId ? (
              <>
                <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
                  {(messages.data?.messages ?? []).map((m) => (
                    <div key={m.id} className="bg-muted rounded-xl px-3 py-2 text-sm">
                      <p>{m.body}</p>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("tickets.replyPlaceholder")}
                    className="rounded-full"
                  />
                  <RyvoButton intent="cta" disabled={!reply} onClick={() => send.mutate()}>
                    {t("tickets.send")}
                  </RyvoButton>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("tickets.selectTicket")}</p>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
