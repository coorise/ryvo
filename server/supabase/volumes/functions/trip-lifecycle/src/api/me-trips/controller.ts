import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { fail } from "../../../../_shared/core/response.ts";
import { ok } from "../deps.ts";
import { listMyTripsForUser } from "../../../../_shared/lib/portal-data.ts";

export const get_v1_me_trips: RouteHandler = async (req, ctx) => {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  try {
    const trips = await listMyTripsForUser(ctx.auth!.userId, ctx.auth!.roles, limit);
    return ok({ trips });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Trip list failed";
    return fail("ME_TRIPS_FAILED", msg, 500);
  }
};
