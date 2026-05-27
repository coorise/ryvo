import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { fail, ok, requireRole } from "../deps.ts";
import { setEmailVerifiedSchema } from "./validator.ts";
import * as service from "./service.ts";

export const patch: RouteHandler = async (req, ctx, params) => {
  const denied = requireRole(ctx.auth!, "super_admin", "admin");
  if (denied) return denied;
  try {
    const body = setEmailVerifiedSchema.parse(await req.json());
    const result = await service.setUserEmailVerified(
      ctx.auth!.userId,
      params.user_id,
      body.is_email_verified,
    );
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return fail("UPDATE_FAILED", msg, 500);
  }
};
