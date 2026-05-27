"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CheckoutSession } from "@/services/finance.service";

const DELAY_PRESETS = [0, 15, 60, 240, 1440] as const;

type CheckoutRecoveryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CheckoutSession | null;
  pending?: boolean;
  onConfirm: (values: {
    message: string;
    send_email: boolean;
    send_push: boolean;
    delay_minutes: number;
  }) => void;
};

export function CheckoutRecoveryDialog({
  open,
  onOpenChange,
  session,
  pending,
  onConfirm,
}: CheckoutRecoveryDialogProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState(60);

  useEffect(() => {
    if (open) {
      setMessage(t("financeCheckouts.recovery.defaultMessage"));
      setSendEmail(true);
      setSendPush(true);
      setDelayMinutes(60);
    }
  }, [open, t]);

  const sendAtLabel = useMemo(() => {
    if (delayMinutes <= 0) return t("financeCheckouts.recovery.sendNow");
    const at = new Date(Date.now() + delayMinutes * 60_000);
    return at.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [delayMinutes, t]);

  const canSubmit = message.trim().length > 0 && (sendEmail || sendPush);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("financeCheckouts.recovery.title")}</DialogTitle>
          <DialogDescription>
            {t("financeCheckouts.recovery.description")}
            {session?.pickup_address ? (
              <span className="mt-2 block text-foreground">
                {session.pickup_address} → {session.dropoff_address ?? "—"}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("financeCheckouts.recovery.message")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={t("financeCheckouts.recovery.messagePlaceholder")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("financeCheckouts.recovery.sendEmail")}</p>
                <p className="text-muted-foreground text-xs">{t("financeCheckouts.recovery.sendEmailHint")}</p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("financeCheckouts.recovery.sendPush")}</p>
                <p className="text-muted-foreground text-xs">{t("financeCheckouts.recovery.sendPushHint")}</p>
              </div>
              <Switch checked={sendPush} onCheckedChange={setSendPush} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("financeCheckouts.recovery.timer")}</Label>
            <div className="flex flex-wrap gap-2">
              {DELAY_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDelayMinutes(m)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold uppercase transition",
                    delayMinutes === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {m === 0
                    ? t("financeCheckouts.recovery.now")
                    : m < 60
                      ? t("financeCheckouts.recovery.minutes", { count: m })
                      : m < 1440
                        ? t("financeCheckouts.recovery.hours", { count: m / 60 })
                        : t("financeCheckouts.recovery.days", { count: m / 1440 })}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                max={10080}
                className="w-28"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Math.max(0, Number(e.target.value)))}
              />
              <span className="text-muted-foreground text-xs">{t("financeCheckouts.recovery.customMinutes")}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("financeCheckouts.recovery.scheduledAt", { when: sendAtLabel })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <RyvoButton intent="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </RyvoButton>
          <RyvoButton
            intent="cta"
            disabled={pending || !canSubmit}
            onClick={() =>
              onConfirm({
                message: message.trim(),
                send_email: sendEmail,
                send_push: sendPush,
                delay_minutes: delayMinutes,
              })
            }
          >
            {t("financeCheckouts.recovery.schedule")}
          </RyvoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
