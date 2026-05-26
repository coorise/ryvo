import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";
import { get_v1_admin_settings_payment, patch_v1_admin_settings_payment } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:read"],
    handler: get_v1_admin_settings_payment,
  },
  {
    method: "GET",
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:read"],
    handler: patch_v1_admin_settings_payment,
  },
];
