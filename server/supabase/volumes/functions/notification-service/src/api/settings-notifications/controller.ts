import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_settings_notifications: RouteHandler = async () => {
      const config = await getNotificationSettings();
      return ok({ config });
    };

export const patch_v1_admin_settings_notifications: RouteHandler = async (req, ctx) => {
      const body = z.object({ events: z.array(notificationEventSchema) }).parse(await req.json());
      const config = await updateNotificationSettings(
        body as NotificationSettingsConfig,
        ctx.auth!.userId,
      );
      await emitAudit(
        ctx.auth!.userId,
        "notification_settings.update",
        "notification_settings",
        "default",
        body,
      );
      return ok({ config });
    };
