import type { RouteDef } from "../../../../_shared/core/router.ts";
import { createTariff, deleteTariff, emitAudit, listTariffs, ok, tariffPackageSchema, upsertTariff } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const post_v1_admin_finance_tariffs: RouteHandler = async (req, ctx) => {
      const body = tariffPackageSchema.parse(await req.json());
      const row = await createTariff(body);
      await emitAudit(ctx.auth!.userId, "tariff.create", "driver_tariff_packages", row.id, { code: body.code });
      return ok({ package: row });
    };

export const put_v1_admin_finance_tariffs_id: RouteHandler = async (req, ctx, params) => {
      const body = tariffPackageSchema.parse(await req.json());
      const row = await upsertTariff({ ...body, id: params.id });
      await emitAudit(ctx.auth!.userId, "tariff.update", "driver_tariff_packages", params.id, {});
      return ok({ package: row });
    };

export const delete_v1_admin_finance_tariffs_id: RouteHandler = async (_req, ctx, params) => {
      await deleteTariff(params.id);
      await emitAudit(ctx.auth!.userId, "tariff.delete", "driver_tariff_packages", params.id, {});
      return ok({ deleted: true });
    };
