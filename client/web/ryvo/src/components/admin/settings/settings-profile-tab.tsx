"use client";

import { User } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { UI } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { settingsService, type SelfProfile } from "@/services/settings.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";

export function SettingsProfileTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => settingsService.getMyProfile(accessToken),
    enabled: Boolean(accessToken),
  });

  const [form, setForm] = useState<Partial<SelfProfile>>({});

  useEffect(() => {
    if (data?.profile) setForm(data.profile);
  }, [data?.profile]);

  const save = useMutation({
    mutationFn: () => settingsService.updateMyProfile(accessToken, form),
    onSuccess: (res) => {
      toast.success(t("settingsHub.profile.saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings", "profile"] });
      if (user && accessToken) {
        setAuth({ accessToken, user: { ...user, email: res.profile.email } });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  }

  const displayName = form.display_name ?? form.full_name ?? form.email ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border-border bg-card overflow-hidden rounded-2xl border">
        <div className="from-primary/15 h-24 bg-gradient-to-r to-transparent" />
        <div className="relative px-6 pb-6">
          <div
            className="border-background bg-muted absolute -top-12 flex items-center justify-center overflow-hidden rounded-full border-4"
            style={{ width: UI.profileAvatarSize, height: UI.profileAvatarSize }}
          >
            {form.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <User className="text-muted-foreground size-10" />
            )}
          </div>
          <div className="pt-14">
            <h2 className="text-xl font-bold">{displayName}</h2>
            <p className="text-muted-foreground text-sm">{form.email}</p>
          </div>
        </div>
      </div>

      <SettingsFormCard
        title={t("settingsHub.profile.title")}
        description={t("settingsHub.profile.description")}
        submitLabel={t("common.save")}
        pending={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="avatar_url">{t("settingsHub.profile.avatarUrl")}</Label>
            <Input
              id="avatar_url"
              value={form.avatar_url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value || null }))}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">{t("settingsHub.profile.fullName")}</Label>
            <Input
              id="full_name"
              value={form.full_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">{t("settingsHub.profile.displayName")}</Label>
            <Input
              id="display_name"
              value={form.display_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">{t("settingsHub.profile.username")}</Label>
            <Input
              id="username"
              value={form.username ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("settingsHub.profile.phone")}</Label>
            <Input
              id="phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_line1">{t("settingsHub.profile.address")}</Label>
            <Input
              id="address_line1"
              value={form.address_line1 ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t("settingsHub.profile.city")}</Label>
            <Input
              id="city"
              value={form.city ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">{t("settingsHub.profile.region")}</Label>
            <Input
              id="region"
              value={form.region ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">{t("settingsHub.profile.postalCode")}</Label>
            <Input
              id="postal_code"
              value={form.postal_code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">{t("settingsHub.profile.country")}</Label>
            <Input
              id="country"
              value={form.country ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">{t("settingsHub.profile.bio")}</Label>
            <textarea
              id="bio"
              rows={3}
              className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={form.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
        </div>
      </SettingsFormCard>
    </div>
  );
}
