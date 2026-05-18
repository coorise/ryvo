"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { APP_NAME, SUPPORTED_LANGUAGES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { adminService } from "@/services";
import type { PlatformPreferences } from "@/types/interfaces/schemas/platform.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminService.getSettings(accessToken),
    enabled: Boolean(accessToken),
  });

  const [form, setForm] = useState<PlatformPreferences>({
    appName: APP_NAME,
    timeZone: "America/Toronto",
    defaultLanguage: "en",
    supportedLanguages: [...SUPPORTED_LANGUAGES],
  });

  useEffect(() => {
    if (data?.preferences) setForm(data.preferences);
  }, [data?.preferences]);

  const save = useMutation({
    mutationFn: (prefs: Partial<PlatformPreferences>) =>
      adminService.updateSettings(accessToken, prefs),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["platform", "public"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settings.description")}</p>
      </div>

      <form
        className="border-border bg-card space-y-4 rounded-3xl border p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="appName">{t("settings.appName")}</Label>
          <Input
            id="appName"
            value={form.appName}
            onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeZone">{t("settings.timeZone")}</Label>
          <Input
            id="timeZone"
            value={form.timeZone}
            onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">{t("settings.defaultLanguage")}</Label>
          <select
            id="defaultLanguage"
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
        <RyvoButton intent="cta" type="submit" className="w-full" disabled={save.isPending}>
          {t("common.save")}
        </RyvoButton>
      </form>
    </div>
  );
}
