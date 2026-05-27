"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { useAuth } from "@/hooks/use-auth";
import { canEditSettingsTab } from "@/guards/abac";
import { settingsService, type EmailTemplate } from "@/services/settings.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TEMPLATE_LABEL_KEYS: Record<string, string> = {
  welcome: "settingsHub.mail.tplWelcome",
  driver_welcome: "settingsHub.mail.tplDriverWelcome",
  email_confirmation_reminder: "settingsHub.mail.tplConfirm",
  password_reset_otp: "settingsHub.mail.tplReset",
  ride_receipt: "settingsHub.mail.tplReceipt",
  order_success: "settingsHub.mail.tplOrderSuccess",
};

export function SettingsMailTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canEditSettingsTab(user, "mail");

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "mail"],
    queryFn: () => settingsService.listEmailTemplates(accessToken),
    enabled: Boolean(accessToken),
  });

  const templates = data?.templates ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const active = templates.find((tpl) => tpl.template_key === selected) ?? templates[0] ?? null;

  const [draft, setDraft] = useState<EmailTemplate | null>(null);

  const selectTemplate = (tpl: EmailTemplate) => {
    setSelected(tpl.template_key);
    setDraft({ ...tpl });
  };

  useEffect(() => {
    if (!draft && active) selectTemplate(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.template_key, templates.length]);

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("No template");
      return settingsService.updateEmailTemplate(accessToken, draft.template_key, {
        subject: draft.subject,
        body_html: draft.body_html,
        body_text: draft.body_text,
      });
    },
    onSuccess: () => {
      toast.success(t("settingsHub.mail.saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings", "mail"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[240px_1fr]">
      <div className="border-border bg-card space-y-1 rounded-2xl border p-2">
        <p className="text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
          {t("settingsHub.mail.templates")}
        </p>
        {templates.map((tpl) => (
          <button
            key={tpl.template_key}
            type="button"
            onClick={() => selectTemplate(tpl)}
            className={cn(
              "w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition",
              (draft?.template_key ?? active?.template_key) === tpl.template_key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {t(TEMPLATE_LABEL_KEYS[tpl.template_key] ?? "settingsHub.mail.tplGeneric", {
              key: tpl.template_key,
            })}
          </button>
        ))}
      </div>

      {draft && (
        <SettingsFormCard
          title={t(TEMPLATE_LABEL_KEYS[draft.template_key] ?? "settingsHub.mail.tplGeneric", {
            key: draft.template_key,
          })}
          description={t("settingsHub.mail.editorHint")}
          submitLabel={t("common.save")}
          pending={save.isPending}
          disabled={!canEdit}
          onSubmit={canEdit ? () => save.mutate() : undefined}
        >
          <div className="space-y-2">
            <Label>{t("settingsHub.mail.subject")}</Label>
            <Input
              disabled={!canEdit}
              value={draft.subject}
              onChange={(e) => setDraft((d) => (d ? { ...d, subject: e.target.value } : d))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("settingsHub.mail.bodyHtml")}</Label>
            <textarea
              rows={8}
              disabled={!canEdit}
              className="border-border bg-background w-full rounded-xl border px-3 py-2 font-mono text-xs"
              value={draft.body_html}
              onChange={(e) => setDraft((d) => (d ? { ...d, body_html: e.target.value } : d))}
            />
            <p className="text-muted-foreground text-xs">{t("settingsHub.mail.placeholders")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("settingsHub.mail.bodyText")}</Label>
            <textarea
              rows={4}
              disabled={!canEdit}
              className="border-border bg-background w-full rounded-xl border px-3 py-2 font-mono text-xs"
              value={draft.body_text ?? ""}
              onChange={(e) => setDraft((d) => (d ? { ...d, body_text: e.target.value } : d))}
            />
          </div>
        </SettingsFormCard>
      )}
    </div>
  );
}
