import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";
import { get_v1_admin_settings_notifications, patch_v1_admin_settings_notifications } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:read"],
    handler: get_v1_admin_settings_notifications,
  },
  {
    method: "GET",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:read"],
    handler: patch_v1_admin_settings_notifications,
  },
];
