import type { RouteDef } from "../../../../_shared/core/router.ts";
import { listPaymentsAdmin, ok } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_payments: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 200);
      const payments = await listPaymentsAdmin({ status, limit });
      return ok({ payments });
    };
