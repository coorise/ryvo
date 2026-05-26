import type { RouteDef } from "../../../../_shared/core/router.ts";
import { completePasswordReset, emailOnlySchema, env, fail, getAdminClient, ok, requestPasswordReset, resetPasswordSchema, verifyOtpSchema, verifyPasswordResetOtp } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const post_v1_auth_forgot_password: RouteHandler = async (req) => {
      const { email } = emailOnlySchema.parse(await req.json());
      const result = await requestPasswordReset(email);
      return ok(result);
    };

export const post_v1_auth_verify_reset_otp: RouteHandler = async (req) => {
      const { email, code } = verifyOtpSchema.parse(await req.json());
      const result = await verifyPasswordResetOtp(email, code);
      if (!result.ok) return fail(result.error, result.message, 400);
      return ok({
        reset_token: result.reset_token,
        expires_minutes: result.expires_minutes,
      });
    };

export const post_v1_auth_reset_password: RouteHandler = async (req) => {
      const body = resetPasswordSchema.parse(await req.json());
      const result = await completePasswordReset(body.email, body.reset_token, body.password);
      if (!result.ok) return fail(result.error, result.message, 400);
      return ok({ message: result.message });
    };

export const get_v1_auth_email_status: RouteHandler = async (_req, ctx) => {
      const db = getAdminClient();
      const { data: user } = await db.auth.admin.getUserById(ctx.auth!.userId);
      const { data: profile } = await db
        .from("user_profiles")
        .select("email_verified_override")
        .eq("user_id", ctx.auth!.userId)
        .maybeSingle();
      const isAdmin = ctx.auth!.roles.includes("admin") || ctx.auth!.roles.includes("super_admin");
      return ok({
        email: user.user?.email,
        email_confirmed_at: user.user?.email_confirmed_at,
        email_verified_override: profile?.email_verified_override ?? null,
        is_email_verified: ctx.auth!.emailVerified,
        admin_bypass: isAdmin,
        otp_expires_minutes: Math.floor(env.mailerOtpExpSec / 60),
      });
    };

export const post_v1_auth_resend_confirmation: RouteHandler = async (_req, ctx) => {
      if (ctx.auth!.emailVerified) {
        return ok({ sent: false, message: "Email already verified" });
      }
      const { data: user } = await getAdminClient().auth.admin.getUserById(ctx.auth!.userId);
      const email = user.user?.email;
      if (!email) return fail("NO_EMAIL", "No email on account", 422);

      const res = await fetch(`${env.supabasePublicUrl}/auth/v1/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.anonKey,
        },
        body: JSON.stringify({ type: "signup", email }),
      });
      if (!res.ok) {
        const err = await res.text();
        return fail("RESEND_FAILED", err || "Could not resend confirmation", 502);
      }
      return ok({ sent: true, message: "Confirmation email sent (valid 30 minutes)" });
    };
