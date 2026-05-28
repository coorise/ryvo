"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { useAuth } from "@/hooks/use-auth";
import { canEditSettingsTab } from "@/guards/abac";
import { settingsService, type PaymentSettingsConfig } from "@/services/settings.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const DEFAULT: PaymentSettingsConfig = {
  currency: "CAD",
  stripeMode: "test",
  platformFeePercent: 20,
  driverPayoutDelayDays: 2,
  minTripFare: 5,
  cancellationFee: 5,
  autoCapture: true,
  tipsEnabled: true,
  requirePreauth: true,
};

export function SettingsPaymentTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canEditSettingsTab(user, "payment");

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "payment"],
    queryFn: () => settingsService.getPayment(accessToken),
    enabled: Boolean(accessToken),
  });

  const [form, setForm] = useState<PaymentSettingsConfig>(DEFAULT);

  useEffect(() => {
    if (data?.config) setForm({ ...DEFAULT, ...data.config });
  }, [data?.config]);

  const save = useMutation({
    mutationFn: () => settingsService.updatePayment(accessToken, form),
    onSuccess: () => {
      toast.success(t("settingsHub.payment.saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings", "payment"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <SettingsFormCard
      className="mx-auto max-w-2xl"
      title={t("settingsHub.payment.title")}
      description={t("settingsHub.payment.description")}
      submitLabel={t("common.save")}
      pending={save.isPending}
      disabled={!canEdit}
      onSubmit={canEdit ? () => save.mutate() : undefined}
    >
      <p className="text-muted-foreground text-xs">{t("settingsHub.payment.secretsHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.currency")}</Label>
          <Input
            disabled={!canEdit}
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.stripeMode")}</Label>
          <select
            disabled={!canEdit}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            value={form.stripeMode}
            onChange={(e) =>
              setForm((f) => ({ ...f, stripeMode: e.target.value as "test" | "live" }))
            }
          >
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t("settingsHub.payment.publishableKey")}</Label>
          <Input
            disabled={!canEdit}
            value={form.stripePublishableKey ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, stripePublishableKey: e.target.value }))}
            placeholder="pk_test_…"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.platformFee")}</Label>
          <Input
            type="number"
            disabled={!canEdit}
            value={form.platformFeePercent}
            onChange={(e) => setForm((f) => ({ ...f, platformFeePercent: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.payoutDelay")}</Label>
          <Input
            type="number"
            disabled={!canEdit}
            value={form.driverPayoutDelayDays}
            onChange={(e) =>
              setForm((f) => ({ ...f, driverPayoutDelayDays: Number(e.target.value) }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.minFare")}</Label>
          <Input
            type="number"
            step="0.01"
            disabled={!canEdit}
            value={form.minTripFare}
            onChange={(e) => setForm((f) => ({ ...f, minTripFare: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settingsHub.payment.cancelFee")}</Label>
          <Input
            type="number"
            step="0.01"
            disabled={!canEdit}
            value={form.cancellationFee}
            onChange={(e) => setForm((f) => ({ ...f, cancellationFee: Number(e.target.value) }))}
          />
        </div>
        {(
          [
            ["autoCapture", t("settingsHub.payment.autoCapture")],
            ["tipsEnabled", t("settingsHub.payment.tips")],
            ["requirePreauth", t("settingsHub.payment.preauth")],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4 sm:col-span-2">
            <p className="text-sm font-medium">{label}</p>
            <Switch
              disabled={!canEdit}
              checked={form[key]}
              onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
            />
          </div>
        ))}
      </div>
    </SettingsFormCard>
  );
}
