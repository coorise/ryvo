import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { PlatformPreferences } from "../../../../_shared/lib/platform-settings.ts";
import type { PaymentSettingsConfig } from "../../../../_shared/lib/payment-settings.ts";
import type { NotificationSettingsConfig } from "../../../../_shared/lib/notification-settings.ts";
import { z, emitAudit, getNotificationSettings, getPaymentSettings, getPlatformPreferences, notificationEventSchema, ok, paymentSettingsSchema, preferencesSchema, updateNotificationSettings, updatePaymentSettings, updatePlatformPreferences } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_settings_payment: RouteHandler = async () => {
      const config = await getPaymentSettings();
      return ok({ config });
    };

export const patch_v1_admin_settings_payment: RouteHandler = async (req, ctx) => {
      const body = paymentSettingsSchema.parse(await req.json());
      const config = await updatePaymentSettings(
        body as Partial<PaymentSettingsConfig>,
        ctx.auth!.userId,
      );
      await emitAudit(ctx.auth!.userId, "payment_settings.update", "payment_settings", "default", body);
      return ok({ config });
    };
