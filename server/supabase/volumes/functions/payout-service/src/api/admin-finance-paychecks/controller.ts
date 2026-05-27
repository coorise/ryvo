import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, cancelPaycheck, createPaycheck, deletePaycheck, emitAudit, fail, holdPaycheck, listPaychecks, ok, resumePaycheck, seedDemoFinanceIfEmpty, updatePaycheckAmount, updatePaycheckStatus } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_finance_paychecks: RouteHandler = async (req) => {
      await seedDemoFinanceIfEmpty();
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ paychecks: await listPaychecks(status) });
    };

export const post_v1_admin_finance_paychecks: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          driver_id: z.string().uuid(),
          amount: z.number().positive(),
          period_label: z.string().optional(),
          note: z.string().optional(),
        })
        .parse(await req.json());
      const row = await createPaycheck(body);
      await emitAudit(ctx.auth!.userId, "paycheck.create", "driver_paychecks", row.id, body);
      return ok({ paycheck: row });
    };

export const patch_v1_admin_finance_paychecks_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          status: z.enum(["pending", "paid", "held", "cancelled"]).optional(),
          amount: z.number().positive().optional(),
          action: z.enum(["hold", "resume", "cancel", "pay"]).optional(),
          reason: z.string().max(2000).optional(),
          notify: z.boolean().optional(),
        })
        .parse(await req.json());

      let row;
      if (body.action === "hold") {
        row = await holdPaycheck(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "resume") {
        row = await resumePaycheck(params.id, { notify: body.notify ?? true });
      } else if (body.action === "cancel") {
        row = await cancelPaycheck(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "pay" || body.status === "paid") {
        row = await updatePaycheckStatus(params.id, "paid", ctx.auth!.userId);
      } else if (body.amount != null) {
        row = await updatePaycheckAmount(params.id, body.amount);
      } else if (body.status) {
        row = await updatePaycheckStatus(params.id, body.status, ctx.auth!.userId);
      } else {
        return fail("VALIDATION", "No update specified", 400);
      }
      await emitAudit(ctx.auth!.userId, "paycheck.update", "driver_paychecks", params.id, body);
      return ok({ paycheck: row });
    };

export const delete_v1_admin_finance_paychecks_id: RouteHandler = async (_req, ctx, params) => {
      const result = await deletePaycheck(params.id);
      await emitAudit(ctx.auth!.userId, "paycheck.delete", "driver_paychecks", params.id, result);
      return ok(result);
    };
