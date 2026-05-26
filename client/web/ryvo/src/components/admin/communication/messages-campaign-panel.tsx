"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminListStack } from "@/components/admin/admin-list-ui";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function MessagesCampaignPanel() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"clients" | "drivers" | "all">("clients");
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(0);

  function handleSchedule() {
    if (!message.trim()) {
      toast.error(t("communication.messages.messageRequired"));
      return;
    }
    toast.success(t("communication.messages.scheduledPlaceholder"));
  }

  return (
    <AdminListStack>
      <p className="text-muted-foreground text-sm">{t("communication.messages.subtitle")}</p>
      <div className="border-border bg-card max-w-2xl space-y-4 rounded-3xl border p-6">
        <div className="space-y-1">
          <Label>{t("communication.messages.audience")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["clients", "drivers", "all"] as const).map((a) => (
              <button
                key={a}
                type="button"
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
          <Textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("communication.messages.bodyPlaceholder")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">{t("communication.messages.sendPush")}</span>
            <Switch checked={sendPush} onCheckedChange={setSendPush} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">{t("communication.messages.sendEmail")}</span>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
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
          />
          <p className="text-muted-foreground text-xs">{t("communication.messages.delayHint")}</p>
        </div>
        <RyvoButton intent="cta" onClick={handleSchedule}>
          {delayMinutes <= 0 ? t("communication.messages.sendNow") : t("communication.messages.schedule")}
        </RyvoButton>
      </div>
    </AdminListStack>
  );
}
