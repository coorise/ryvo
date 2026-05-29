"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEYS } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { rbacService } from "@/services/rbac.service";

export type ProfileManageValues = {
  full_name: string | null;
  email: string;
  phone: string | null;
  username: string | null;
  custom_fields: Record<string, string>;
};

type CustomRow = { id: string; key: string; value: string };

type ProfileManageSectionProps = {
  userId: string;
  canEdit: boolean;
  initial: ProfileManageValues;
  /** Invalidate driver detail query when editing a driver profile */
  invalidateDriverDetail?: boolean;
};

function rowsFromFields(fields: Record<string, string>): CustomRow[] {
  const entries = Object.entries(fields);
  if (entries.length === 0) return [{ id: "0", key: "", value: "" }];
  return entries.map(([key, value], i) => ({ id: String(i), key, value }));
}

function fieldsFromRows(rows: CustomRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (!k) continue;
    out[k] = row.value;
  }
  return out;
}

export function ProfileManageSection({
  userId,
  canEdit,
  initial,
  invalidateDriverDetail,
}: ProfileManageSectionProps) {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [username, setUsername] = useState(initial.username ?? "");
  const [customRows, setCustomRows] = useState<CustomRow[]>(() =>
    rowsFromFields(initial.custom_fields),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFullName(initial.full_name ?? "");
    setEmail(initial.email);
    setPhone(initial.phone ?? "");
    setUsername(initial.username ?? "");
    setCustomRows(rowsFromFields(initial.custom_fields));
  }, [initial]);

  const mutation = useMutation({
    mutationFn: () =>
      rbacService.updateUser(accessToken, userId, {
        full_name: fullName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        username: username.trim() || null,
        custom_fields: fieldsFromRows(customRows),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.userDetail(userId) });
      if (invalidateDriverDetail) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.driverDetail(userId) });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (!canEdit) return null;

  const addRow = () => {
    setCustomRows((prev) => [...prev, { id: String(Date.now()), key: "", value: "" }]);
  };

  const removeRow = (id: string) => {
    setCustomRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: "0", key: "", value: "" }];
    });
  };

  return (
    <section className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">{t("profile.manageTitle")}</h2>
        {saved && (
          <span className="text-primary text-sm font-medium">{t("profile.saved")}</span>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{t("profile.manageHint")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-full-name">{t("profile.fullName")}</Label>
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">{t("profile.email")}</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-phone">{t("profile.phone")}</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-username">{t("profile.username")}</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>{t("profile.customFields")}</Label>
          <RyvoButton type="button" intent="outline" size="sm" onClick={addRow}>
            <Plus className="size-4" /> {t("profile.addField")}
          </RyvoButton>
        </div>
        <div className="space-y-2">
          {customRows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-[8rem] flex-1"
                placeholder={t("profile.fieldKey")}
                value={row.key}
                onChange={(e) =>
                  setCustomRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
                  )
                }
              />
              <Input
                className="min-w-[8rem] flex-[2]"
                placeholder={t("profile.fieldValue")}
                value={row.value}
                onChange={(e) =>
                  setCustomRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                  )
                }
              />
              <RyvoButton
                type="button"
                intent="ghost"
                size="sm"
                aria-label={t("profile.removeField")}
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="size-4" />
              </RyvoButton>
            </div>
          ))}
        </div>
      </div>

      <RyvoButton
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="min-w-[8rem]"
      >
        {mutation.isPending ? t("common.saving") : t("common.save")}
      </RyvoButton>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          {mutation.error instanceof Error ? mutation.error.message : t("common.error")}
        </p>
      )}
    </section>
  );
}
