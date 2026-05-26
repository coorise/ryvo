"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import {
  insertAtCursor,
  renderMessagePreview,
  tokensForAudience,
  type MessageAudience,
} from "@/lib/message-template";
import {
  messagesService,
  type AdminMessageCampaign,
  type MessageCampaignFormInput,
} from "@/services/messages.service";

type MessageComposeFormProps = {
  mode: "create" | "edit";
  campaign?: AdminMessageCampaign;
};

function formFromCampaign(c: AdminMessageCampaign): MessageCampaignFormInput {
  return {
    audience: c.audience,
    body_template: c.body_template,
    send_push: c.send_push,
    send_email: c.send_email,
    delay_minutes: c.delay_minutes,
  };
}

export function MessageComposeForm({ mode, campaign }: MessageComposeFormProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [audience, setAudience] = useState<MessageAudience>(campaign?.audience ?? "clients");
  const [message, setMessage] = useState(campaign?.body_template ?? "");
  const [sendPush, setSendPush] = useState(campaign?.send_push ?? true);
  const [sendEmail, setSendEmail] = useState(campaign?.send_email ?? false);
  const [delayMinutes, setDelayMinutes] = useState(campaign?.delay_minutes ?? 0);

  useEffect(() => {
    if (!campaign) return;
    const f = formFromCampaign(campaign);
    setAudience(f.audience);
    setMessage(f.body_template);
    setSendPush(f.send_push);
    setSendEmail(f.send_email);
    setDelayMinutes(f.delay_minutes);
  }, [campaign]);

  const tokens = useMemo(() => tokensForAudience(audience), [audience]);

  const formPayload = (): MessageCampaignFormInput => ({
    audience,
    body_template: message.trim(),
    send_push: sendPush,
    send_email: sendEmail,
    delay_minutes: delayMinutes,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.messageCampaigns });
    if (campaign?.id) {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.admin.messageCampaign(campaign.id) });
    }
  };

  const saveDraft = useMutation({
    mutationFn: async () => {
      const body = { ...formPayload(), status: "draft" as const };
      if (mode === "create") {
        return messagesService.create(accessToken, body);
      }
      return messagesService.update(accessToken, campaign!.id, body);
    },
    onSuccess: (res) => {
      invalidate();
      toast.success(t("communication.messages.draftSaved"));
      if (mode === "create" && "campaign" in res) {
        router.push(ROUTES.admin.communication.messageEdit(res.campaign.id));
        return;
      }
      if (mode === "edit") return;
      router.push(ROUTES.admin.communication.messages);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      const body = formPayload();
      if (mode === "create") {
        return messagesService.create(accessToken, {
          ...body,
          status: delayMinutes > 0 ? "queued" : "sent",
        });
      }
      return messagesService.send(accessToken, campaign!.id, body);
    },
    onSuccess: () => {
      invalidate();
      toast.success(
        delayMinutes > 0
          ? t("communication.messages.scheduled")
          : t("communication.messages.sent"),
      );
      router.push(ROUTES.admin.communication.messages);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function validateBody(): boolean {
    if (!message.trim()) {
      toast.error(t("communication.messages.messageRequired"));
      return false;
    }
    return true;
  }

  const isPending = saveDraft.isPending || sendNow.isPending;
  const readOnlySend = mode === "edit" && campaign?.status === "sent";

  return (
    <div className="border-border bg-card mx-auto max-w-2xl space-y-4 rounded-3xl border p-6">
      <div className="space-y-1">
        <Label>{t("communication.messages.audience")}</Label>
        <div className="flex flex-wrap gap-2">
          {(["clients", "drivers", "all"] as const).map((a) => (
            <button
              key={a}
              type="button"
              disabled={readOnlySend}
              onClick={() => setAudience(a)}
              className={
                audience === a
                  ? "bg-primary text-primary-foreground rounded-xl px-3 py-1.5 text-xs font-bold uppercase"
                  : "bg-muted text-muted-foreground rounded-xl px-3 py-1.5 text-xs font-bold uppercase"
              }
            >
              {t(`communication.messages.audience_${a}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t("communication.messages.body")}</Label>
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
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("communication.messages.bodyPlaceholder")}
          ref={textareaRef}
          disabled={readOnlySend}
        />
        <div className="border-border bg-muted/30 rounded-2xl border p-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("communication.messages.preview")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {renderMessagePreview(message || t("communication.messages.previewEmpty"))}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-border flex items-center justify-between gap-3 rounded-xl border p-3">
          <span className="text-sm font-medium">{t("communication.messages.sendPush")}</span>
          <Switch checked={sendPush} onCheckedChange={setSendPush} disabled={readOnlySend} />
        </div>
        <div className="border-border flex items-center justify-between gap-3 rounded-xl border p-3">
          <span className="text-sm font-medium">{t("communication.messages.sendEmail")}</span>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} disabled={readOnlySend} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t("communication.messages.delay")}</Label>
        <Input
          type="number"
          min={0}
          className="w-32"
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(Number(e.target.value))}
          disabled={readOnlySend}
        />
        <p className="text-muted-foreground text-xs">{t("communication.messages.delayHint")}</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Link href={ROUTES.admin.communication.messages}>
          <RyvoButton intent="outline" type="button">
            {t("common.cancel")}
          </RyvoButton>
        </Link>
        {!readOnlySend && (
          <>
            <RyvoButton
              intent="outline"
              disabled={isPending}
              onClick={() => validateBody() && saveDraft.mutate()}
            >
              {t("communication.messages.saveDraft")}
            </RyvoButton>
            <RyvoButton
              intent="cta"
              disabled={isPending}
              onClick={() => validateBody() && sendNow.mutate()}
            >
              {delayMinutes <= 0 ? t("communication.messages.sendNow") : t("communication.messages.schedule")}
            </RyvoButton>
          </>
        )}
      </div>
    </div>
  );
}
