"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { SUPPORTED_LANGUAGES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { setAppLanguage } from "@/i18n";
import { settingsService } from "@/services/settings.service";
import { Label } from "@/components/ui/label";

export function PortalSettingsGeneralPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [locale, setLocale] = useState("en");

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => settingsService.getMyProfile(accessToken),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (data?.profile?.locale) setLocale(data.profile.locale.slice(0, 2));
  }, [data?.profile?.locale]);

  const save = useMutation({
    mutationFn: () => settingsService.updateMyProfile(accessToken, { locale }),
    onSuccess: async () => {
      await setAppLanguage(locale);
      toast.success(t("settingsHub.profile.saved"));
      void qc.invalidateQueries({ queryKey: ["settings", "profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsFormCard
      title={t("portal.settings.tabs.general")}
      description={t("portal.settings.generalHint")}
      onSubmit={() => save.mutate()}
      pending={save.isPending}
      disabled={isLoading}
    >
      <div className="space-y-2">
        <Label>{t("portal.settings.language")}</Label>
        <select
          className="border-border bg-background w-full max-w-xs rounded-xl border px-3 py-2 text-sm"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {lng.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </SettingsFormCard>
  );
}
