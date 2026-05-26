import type { RouteDef } from "../../../../_shared/core/router.ts";
import { completePasswordReset, emailOnlySchema, env, fail, getAdminClient, ok, requestPasswordReset, resetPasswordSchema, verifyOtpSchema, verifyPasswordResetOtp } from "../deps.ts";
import { post_v1_auth_forgot_password, post_v1_auth_verify_reset_otp, post_v1_auth_reset_password, get_v1_auth_email_status, post_v1_auth_resend_confirmation } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: post_v1_auth_forgot_password,
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: post_v1_auth_verify_reset_otp,
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: post_v1_auth_reset_password,
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: get_v1_auth_email_status,
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: post_v1_auth_resend_confirmation,
  },
];
