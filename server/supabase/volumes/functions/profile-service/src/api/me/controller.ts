import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { emitAudit, fail, getSelfProfile, ok, selfProfileSchema, updateSelfProfile } from "../deps.ts";

export const get_v1_me_profile: RouteHandler = async (_req, ctx) => {
  try {
    const profile = await getSelfProfile(ctx.auth!.userId);
    return ok({ profile });
  } catch (e) {
    return fail("PROFILE_ERROR", (e as Error).message, 400);
  }
};

export const patch_v1_me_profile: RouteHandler = async (req, ctx) => {
  try {
    const body = selfProfileSchema.parse(await req.json());
    const profile = await updateSelfProfile(ctx.auth!.userId, body);
    await emitAudit(ctx.auth!.userId, "profile.self_update", "user", ctx.auth!.userId, {});
    return ok({ profile });
  } catch (e) {
    return fail("PROFILE_ERROR", (e as Error).message, 400);
  }
};
