import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, deleteCheckoutSession, emitAudit, listCheckouts, ok, scheduleCheckoutRecovery, seedDemoFinanceIfEmpty } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_finance_checkouts: RouteHandler = async (req) => {
      await seedDemoFinanceIfEmpty();
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ sessions: await listCheckouts(status) });
    };

export const delete_v1_admin_finance_checkouts_id: RouteHandler = async (_req, ctx, params) => {
      const result = await deleteCheckoutSession(params.id);
      await emitAudit(
        ctx.auth!.userId,
        "checkout.delete",
        "checkout_sessions",
        params.id,
        {},
      );
      return ok(result);
    };

export const post_v1_admin_finance_checkouts_id_recovery_reminder: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          message: z.string().min(1).max(2000),
          send_email: z.boolean(),
          send_push: z.boolean(),
          delay_minutes: z.number().min(0).max(10080),
        })
        .parse(await req.json());
      const reminder = await scheduleCheckoutRecovery(params.id, ctx.auth!.userId, body);
      await emitAudit(
        ctx.auth!.userId,
        "checkout.recovery_scheduled",
        "checkout_sessions",
        params.id,
        {
          reminder_id: reminder.id,
          send_at: reminder.send_at,
          send_email: body.send_email,
          send_push: body.send_push,
        },
      );
      return ok({ reminder });
    };
