import { getAdminClient } from "./supabase.ts";

export type NotificationChannelFlags = {
  push: boolean;
  email: boolean;
  sms: boolean;
};

export type NotificationAudienceFlags = {
  client: boolean;
  driver: boolean;
  staff: boolean;
};

export type NotificationEventRule = {
  key: string;
  enabled: boolean;
  channels: NotificationChannelFlags;
  audiences: NotificationAudienceFlags;
};

export type NotificationSettingsConfig = {
  events: NotificationEventRule[];
};

const DEFAULT_EVENTS: NotificationEventRule[] = [
  {
    key: "ride.requested",
    enabled: true,
    channels: { push: true, email: false, sms: false },
    audiences: { client: true, driver: true, staff: false },
  },
  {
    key: "ride.accepted",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: true, driver: false, staff: false },
  },
  {
    key: "ride.driver_arriving",
    enabled: true,
    channels: { push: true, email: false, sms: true },
    audiences: { client: true, driver: false, staff: false },
  },
  {
    key: "ride.completed",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: true, driver: true, staff: false },
  },
  {
    key: "ride.cancelled",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: true, driver: true, staff: true },
  },
  {
    key: "payment.succeeded",
    enabled: true,
    channels: { push: false, email: true, sms: false },
    audiences: { client: true, driver: false, staff: false },
  },
  {
    key: "payment.failed",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: true, driver: false, staff: true },
  },
  {
    key: "driver.kyc.approved",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: false, driver: true, staff: false },
  },
  {
    key: "driver.kyc.rejected",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: false, driver: true, staff: false },
  },
  {
    key: "support.reply",
    enabled: true,
    channels: { push: true, email: true, sms: false },
    audiences: { client: true, driver: true, staff: false },
  },
];

export async function getNotificationSettings(): Promise<NotificationSettingsConfig> {
  const db = getAdminClient();
  const { data } = await db
    .from("notification_settings")
    .select("config")
    .eq("id", "default")
    .maybeSingle();
  const events = (data?.config as NotificationSettingsConfig | undefined)?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return { events: DEFAULT_EVENTS };
  }
  return { events };
}

export async function updateNotificationSettings(
  config: NotificationSettingsConfig,
  updatedBy: string,
): Promise<NotificationSettingsConfig> {
  const db = getAdminClient();
  const { error } = await db.from("notification_settings").upsert({
    id: "default",
    config,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return config;
}
