import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, adjustDriverEarning, cancelTariffSubscription, createTariffSubscription, deleteTariffSubscription, emitAudit, getAdminClient, holdTariffSubscription, listDriverEarnings, listTariffSubscriptions, migrateTariffSubscription, ok, queuePaycheckFromEarnings, resumeTariffSubscription } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_finance_tariff_subscriptions: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ subscriptions: await listTariffSubscriptions(status) });
    };

export const get_v1_admin_finance_driver_earnings: RouteHandler = async () => {
  return ok({ earnings: await listDriverEarnings() });
};

export const post_v1_admin_finance_tariff_subscriptions: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          driver_id: z.string().uuid(),
          tariff_package_id: z.string().uuid(),
          notify: z.boolean().optional(),
        })
        .parse(await req.json());
      const row = await createTariffSubscription(body);
      await emitAudit(ctx.auth!.userId, "subscription.create", "driver_tariff_subscriptions", row.id, body);
      return ok({ subscription: row });
    };

export const patch_v1_admin_finance_tariff_subscriptions_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          action: z.enum(["hold", "resume", "cancel", "migrate"]),
          reason: z.string().max(2000).optional(),
          notify: z.boolean().optional(),
          tariff_package_id: z.string().uuid().optional(),
        })
        .parse(await req.json());
      let row;
      if (body.action === "hold") {
        row = await holdTariffSubscription(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "resume") {
        row = await resumeTariffSubscription(params.id, { notify: body.notify ?? true });
      } else if (body.action === "migrate") {
        if (!body.tariff_package_id) throw new Error("tariff_package_id required for migrate");
        const db = getAdminClient();
        const { data: sub } = await db
          .from("driver_tariff_subscriptions")
          .select("driver_id")
          .eq("id", params.id)
          .single();
        if (!sub) throw new Error("Subscription not found");
        row = await migrateTariffSubscription({
          driver_id: String(sub.driver_id),
          tariff_package_id: body.tariff_package_id,
          notify: body.notify ?? true,
        });
      } else {
        row = await cancelTariffSubscription(params.id, { reason: body.reason, notify: body.notify ?? true });
      }
      await emitAudit(ctx.auth!.userId, "subscription.update", "driver_tariff_subscriptions", params.id, body);
      return ok({ subscription: row });
    };

export const patch_v1_admin_finance_driver_earnings_driverId: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          delta: z.number().optional(),
          balance: z.number().min(0).optional(),
        })
        .parse(await req.json());
      const row = await adjustDriverEarning(params.driverId, body.delta ?? 0, body.balance);
      await emitAudit(ctx.auth!.userId, "driver_earnings.adjust", "driver_earnings", params.driverId, body);
      return ok({ earning: row });
    };

export const post_v1_admin_finance_driver_earnings_driverId_queue_paycheck: RouteHandler = async (req, ctx, params) => {
      const body = z.object({ amount: z.number().positive() }).parse(await req.json());
      const paycheck = await queuePaycheckFromEarnings(params.driverId, body.amount);
      await emitAudit(ctx.auth!.userId, "paycheck.create", "driver_paychecks", paycheck.id, body);
      return ok({ paycheck });
    };

export const delete_v1_admin_finance_tariff_subscriptions_id: RouteHandler = async (_req, ctx, params) => {
      const result = await deleteTariffSubscription(params.id);
      await emitAudit(ctx.auth!.userId, "subscription.delete", "driver_tariff_subscriptions", params.id, result);
      return ok(result);
    };
