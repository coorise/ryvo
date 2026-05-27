import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_settings_public: RouteHandler = async () => {
      const preferences = await getPlatformPreferences();
      return ok({
        appName: preferences.appName,
        defaultLanguage: preferences.defaultLanguage,
        supportedLanguages: preferences.supportedLanguages,
        defaultMapCenter: preferences.defaultMapCenter,
      });
    };

export const get_v1_admin_settings: RouteHandler = async () => {
      const preferences = await getPlatformPreferences();
      return ok({ preferences });
    };

export const patch_v1_admin_settings: RouteHandler = async (req, ctx) => {
      const body = preferencesSchema.parse(await req.json());
      const preferences = await updatePlatformPreferences(
        body as Partial<PlatformPreferences>,
        ctx.auth!.userId,
      );
      await emitAudit(ctx.auth!.userId, "platform_settings.update", "platform_settings", "default", body);
      return ok({ preferences });
    };
