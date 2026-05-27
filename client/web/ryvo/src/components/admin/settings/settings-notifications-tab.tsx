"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsFormCard } from "@/components/admin/settings/settings-form-card";
import { useAuth } from "@/hooks/use-auth";
import { canEditSettingsTab } from "@/guards/abac";
import {
  settingsService,
  type NotificationEventRule,
} from "@/services/settings.service";
import { Switch } from "@/components/ui/switch";

const EVENT_LABEL_KEYS: Record<string, string> = {
  "ride.requested": "settingsHub.notifications.rideRequested",
  "ride.accepted": "settingsHub.notifications.rideAccepted",
  "ride.driver_arriving": "settingsHub.notifications.driverArriving",
  "ride.completed": "settingsHub.notifications.rideCompleted",
  "ride.cancelled": "settingsHub.notifications.rideCancelled",
  "payment.succeeded": "settingsHub.notifications.paymentSucceeded",
  "payment.failed": "settingsHub.notifications.paymentFailed",
  "driver.kyc.approved": "settingsHub.notifications.kycApproved",
  "driver.kyc.rejected": "settingsHub.notifications.kycRejected",
  "support.reply": "settingsHub.notifications.supportReply",
};

export function SettingsNotificationsTab() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canEditSettingsTab(user, "notifications");

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: () => settingsService.getNotifications(accessToken),
    enabled: Boolean(accessToken),
  });

  const [events, setEvents] = useState<NotificationEventRule[]>([]);

  useEffect(() => {
    if (data?.config?.events) setEvents(data.config.events);
  }, [data?.config?.events]);

  const save = useMutation({
    mutationFn: () => settingsService.updateNotifications(accessToken, events),
    onSuccess: () => {
      toast.success(t("settingsHub.notifications.saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings", "notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  function patchEvent(index: number, patch: Partial<NotificationEventRule>) {
    setEvents((list) =>
      list.map((ev, i) => (i === index ? { ...ev, ...patch } : ev)),
    );
  }

  return (
    <SettingsFormCard
      className="mx-auto max-w-3xl"
      title={t("settingsHub.notifications.title")}
      description={t("settingsHub.notifications.description")}
      submitLabel={t("common.save")}
      pending={save.isPending}
      disabled={!canEdit}
      onSubmit={canEdit ? () => save.mutate() : undefined}
    >
      <div className="space-y-4">
        {events.map((ev, index) => (
          <div key={ev.key} className="border-border rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {t(EVENT_LABEL_KEYS[ev.key] ?? "settingsHub.notifications.generic", {
                    key: ev.key,
                  })}
                </p>
                <p className="text-muted-foreground font-mono text-xs">{ev.key}</p>
              </div>
              <Switch
                disabled={!canEdit}
                checked={ev.enabled}
                onCheckedChange={(enabled) => patchEvent(index, { enabled })}
              />
            </div>
            {ev.enabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
                    {t("settingsHub.notifications.channels")}
                  </p>
                  {(["push", "email", "sms"] as const).map((ch) => (
                    <label key={ch} className="flex items-center justify-between py-1 text-sm">
                      <span className="capitalize">{ch}</span>
                      <Switch
                        disabled={!canEdit}
                        checked={ev.channels[ch]}
                        onCheckedChange={(v) =>
                          patchEvent(index, {
                            channels: { ...ev.channels, [ch]: v },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
                    {t("settingsHub.notifications.audiences")}
                  </p>
                  {(["client", "driver", "staff"] as const).map((aud) => (
                    <label key={aud} className="flex items-center justify-between py-1 text-sm">
                      <span className="capitalize">{aud}</span>
                      <Switch
                        disabled={!canEdit}
                        checked={ev.audiences[aud]}
                        onCheckedChange={(v) =>
                          patchEvent(index, {
                            audiences: { ...ev.audiences, [aud]: v },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SettingsFormCard>
  );
}
