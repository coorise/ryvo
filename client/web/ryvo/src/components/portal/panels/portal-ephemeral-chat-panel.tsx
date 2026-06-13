"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send } from "lucide-react";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { tripChatService } from "@/services/trip-chat.service";
import { tripService } from "@/services/trip.service";

export function PortalEphemeralChatPanel() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const activeQ = useQuery({
    queryKey: ["portal", "trip-active-chat"],
    queryFn: () => tripService.getActiveTrip(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: 8000,
  });

  const tripId = activeQ.data?.trip?.id ? String(activeQ.data.trip.id) : null;
  const phase = activeQ.data?.phase;

  const messagesQ = useQuery({
    queryKey: ["portal", "trip-chat", tripId],
    queryFn: () => tripChatService.listMessages(accessToken, tripId!),
    enabled: Boolean(accessToken) && Boolean(tripId) && phase === "active_trip",
    refetchInterval: 4000,
  });

  const sendM = useMutation({
    mutationFn: (body: string) => tripChatService.sendMessage(accessToken, tripId!, body),
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["portal", "trip-chat", tripId] });
    },
  });

  if (activeQ.isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
      </p>
    );
  }

  if (!tripId || phase !== "active_trip") {
    return <p className="text-muted-foreground text-sm">{t("portal.chat.empty")}</p>;
  }

  const messages = messagesQ.data?.messages ?? [];

  return (
    <div className="border-border flex h-[min(60vh,28rem)] flex-col rounded-2xl border">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("portal.chat.noMessages")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={mine ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground text-sm" : "bg-muted max-w-[85%] rounded-2xl px-3 py-2 text-sm"}
              >
                {m.body}
              </div>
            );
          })
        )}
      </div>
      <form
        className="border-border flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          sendM.mutate(draft.trim());
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("portal.chat.inputPlaceholder")}
        />
        <RyvoButton intent="cta" type="submit" disabled={sendM.isPending || !draft.trim()}>
          <Send className="size-4" />
        </RyvoButton>
      </form>
    </div>
  );
}
