import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { fail } from "../../../../_shared/core/response.ts";
import { ok } from "../deps.ts";
import { listMyPaymentsForUser } from "../../../../_shared/lib/portal-data.ts";

export const get_v1_me_payments: RouteHandler = async (req, ctx) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200);
  try {
    const payments = await listMyPaymentsForUser(ctx.auth!.userId, ctx.auth!.roles, {
      status,
      limit,
    });
    return ok({ payments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment list failed";
    return fail("ME_PAYMENTS_FAILED", msg, 500);
  }
};
