"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { APP_NAME, SUPPORTED_LANGUAGES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { canEditSettingsTab } from "@/guards/abac";
import { settingsService } from "@/services/settings.service";
import type { PlatformPreferences } from "@/types/interfaces/schemas/platform.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsGeneralTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canEditSettingsTab(user, "general");

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "general"],
    queryFn: () => settingsService.getGeneral(accessToken),
    enabled: Boolean(accessToken),
  });

  const [form, setForm] = useState<PlatformPreferences>({
    appName: APP_NAME,
    timeZone: "America/Toronto",
    defaultLanguage: "en",
    supportedLanguages: [...SUPPORTED_LANGUAGES],
  });

  useEffect(() => {
    if (data?.preferences) setForm({ ...form, ...data.preferences });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.preferences]);

  const save = useMutation({
    mutationFn: () => settingsService.updateGeneral(accessToken, form),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings", "general"] });
      void queryClient.invalidateQueries({ queryKey: ["platform", "public"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <SettingsFormCard
      className="mx-auto max-w-2xl"
      title={t("settingsHub.general.title")}
      description={t("settingsHub.general.description")}
      submitLabel={t("common.save")}
      pending={save.isPending}
      disabled={!canEdit}
      onSubmit={canEdit ? () => save.mutate() : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="appName">{t("settings.appName")}</Label>
          <Input
            id="appName"
            disabled={!canEdit}
            value={form.appName}
            onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeZone">{t("settings.timeZone")}</Label>
          <Input
            id="timeZone"
            disabled={!canEdit}
            value={form.timeZone}
            onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">{t("settings.defaultLanguage")}</Label>
          <select
            id="defaultLanguage"
            disabled={!canEdit}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            value={form.defaultLanguage}
            onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
          >
            {SUPPORTED_LANGUAGES.map((lng) => (
              <option key={lng} value={lng}>
                {lng.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportEmail">{t("settingsHub.general.supportEmail")}</Label>
          <Input
            id="supportEmail"
            disabled={!canEdit}
            value={form.supportEmail ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxSearchRadiusKm">{t("settingsHub.general.maxRadius")}</Label>
          <Input
            id="maxSearchRadiusKm"
            type="number"
            disabled={!canEdit}
            value={form.maxSearchRadiusKm ?? 50}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxSearchRadiusKm: Number(e.target.value) }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancelWindowMinutes">{t("settingsHub.general.cancelWindow")}</Label>
          <Input
            id="cancelWindowMinutes"
            type="number"
            disabled={!canEdit}
            value={form.cancelWindowMinutes ?? 5}
            onChange={(e) =>
              setForm((f) => ({ ...f, cancelWindowMinutes: Number(e.target.value) }))
            }
          />
        </div>
        <div className="flex items-center justify-between gap-4 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">{t("settingsHub.general.scheduledRides")}</p>
            <p className="text-muted-foreground text-xs">{t("settingsHub.general.scheduledRidesHint")}</p>
          </div>
          <Switch
            disabled={!canEdit}
            checked={form.scheduledRideEnabled ?? true}
            onCheckedChange={(v) => setForm((f) => ({ ...f, scheduledRideEnabled: v }))}
          />
        </div>
        <div className="flex items-center justify-between gap-4 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">{t("settingsHub.general.maintenance")}</p>
            <p className="text-muted-foreground text-xs">{t("settingsHub.general.maintenanceHint")}</p>
          </div>
          <Switch
            disabled={!canEdit}
            checked={form.maintenanceMode ?? false}
            onCheckedChange={(v) => setForm((f) => ({ ...f, maintenanceMode: v }))}
          />
        </div>
        {form.maintenanceMode && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="maintenanceMessage">{t("settingsHub.general.maintenanceMessage")}</Label>
            <textarea
              id="maintenanceMessage"
              rows={2}
              disabled={!canEdit}
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={form.maintenanceMessage ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))}
            />
          </div>
        )}
      </div>
    </SettingsFormCard>
  );
}
