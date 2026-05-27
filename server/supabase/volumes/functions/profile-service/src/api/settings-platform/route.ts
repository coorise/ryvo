import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";
import { get_v1_settings_public, get_v1_admin_settings, patch_v1_admin_settings } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/settings/public",
    auth: false,
    handler: get_v1_settings_public,
  },
  {
    method: "GET",
    path: "/v1/admin/settings",
    auth: true,
    permissions: ["settings:read"],
    handler: get_v1_admin_settings,
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings",
    auth: true,
    permissions: ["settings:update"],
    handler: patch_v1_admin_settings,
  },
];
