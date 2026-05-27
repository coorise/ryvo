import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, getAdminClient, ok, verifyServiceSignature } from "../deps.ts";
import { post_v1_internal_post_signup, post_v1_internal_pre_sign_in } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "POST",
    path: "/v1/internal/post-signup",
    auth: false,
    handler: post_v1_internal_post_signup,
  },
  {
    method: "POST",
    path: "/v1/internal/post-signup",
    auth: false,
    handler: post_v1_internal_pre_sign_in,
  },
];
