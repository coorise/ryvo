import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { env } from "../../_shared/lib/env.ts";
import { verifyServiceSignature } from "../../_shared/middleware/service-auth.ts";
import { requirePermission, requireRole } from "../../_shared/middleware/auth.ts";
import { emitAudit } from "../../_shared/lib/events.ts";
import { z } from "zod";

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_name: z.enum(["super_admin", "admin", "moderator", "staff", "driver", "client"]),
});

export const handle = createServiceRouter("auth-hooks", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "auth-hooks" }),
  },
  {
    method: "GET",
    path: "/v1/auth/email-status",
    auth: true,
    handler: async (_req, ctx) => {
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
    },
  },
  {
    method: "POST",
    path: "/v1/auth/resend-confirmation",
    auth: true,
    handler: async (_req, ctx) => {
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
    },
  },
  {
    method: "GET",
    path: "/v1/admin/email-templates",
    auth: true,
    permissions: ["email:templates"],
    handler: async () => {
      const db = getAdminClient();
      const { data } = await db.from("email_templates").select("*").order("template_key");
      return ok({ templates: data });
    },
  },
  {
    method: "PUT",
    path: "/v1/admin/email-templates/:template_key",
    auth: true,
    permissions: ["email:templates"],
    handler: async (req, ctx, params) => {
      const body = await req.json();
      const db = getAdminClient();
      const { data, error } = await db
        .from("email_templates")
        .upsert({
          template_key: params.template_key,
          subject: body.subject,
          body_html: body.body_html,
          body_text: body.body_text ?? null,
          updated_by: ctx.auth!.userId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return fail("SAVE_FAILED", error.message, 500);
      await emitAudit(ctx.auth!.userId, "email_template.update", "email_templates", params.template_key, {});
      return ok({ template: data });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/users/:user_id/email-verified",
    auth: true,
    permissions: ["users:verify_email"],
    handler: async (req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin");
      if (denied) return denied;
      const { is_email_verified } = z.object({ is_email_verified: z.boolean() }).parse(await req.json());
      const db = getAdminClient();

      const { error } = await db.rpc("admin_set_email_verified", {
        p_user_id: params.user_id,
        p_verified: is_email_verified,
      });
      if (error) return fail("UPDATE_FAILED", error.message, 500);

      await emitAudit(ctx.auth!.userId, "user.email_verified", "user", params.user_id, {
        is_email_verified,
      });
      return ok({ user_id: params.user_id, is_email_verified });
    },
  },
  {
    method: "POST",
    path: "/v1/internal/post-signup",
    auth: false,
    handler: async (req) => {
      const body = await req.text();
      const badSig = verifyServiceSignature(req, body);
      if (badSig) return badSig;
      const { user_id, email } = JSON.parse(body);
      const db = getAdminClient();
      await db.from("user_profiles").upsert({
        user_id,
        tos_accepted_at: new Date().toISOString(),
        gdpr_consent_at: new Date().toISOString(),
      });
      const role = email?.includes("driver") ? "driver" : "client";
      const { data: roleRow } = await db.from("roles").select("id").eq("name", role).single();
      if (roleRow) {
        await db.from("user_roles").upsert({ user_id, role_id: roleRow.id });
      }
      if (role === "client") await db.from("rider_profiles").upsert({ user_id });
      if (role === "driver") {
        await db.from("driver_profiles").upsert({ user_id, kyc_status: "pending" });
      }
      return ok({ user_id, role });
    },
  },
  {
    method: "POST",
    path: "/v1/internal/pre-sign-in",
    auth: false,
    handler: async (req) => {
      const { user_id } = await req.json();
      const db = getAdminClient();
      const { data } = await db
        .from("user_profiles")
        .select("banned_at")
        .eq("user_id", user_id)
        .maybeSingle();
      if (data?.banned_at) {
        return fail("ACCOUNT_SUSPENDED", "Account suspended", 403);
      }
      return ok({ allowed: true });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/roles/assign",
    auth: true,
    permissions: ["users:ban"],
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin");
      if (denied) return denied;
      const input = assignRoleSchema.parse(await req.json());
      const db = getAdminClient();
      const { data: role } = await db
        .from("roles")
        .select("id")
        .eq("name", input.role_name)
        .single();
      if (!role) return fail("ROLE_NOT_FOUND", "Role not found", 404);
      await db.from("user_roles").upsert({
        user_id: input.user_id,
        role_id: role.id,
        granted_by: ctx.auth!.userId,
      });
      await emitAudit(ctx.auth!.userId, "role.assign", "user", input.user_id, {
        role: input.role_name,
      });
      return ok({ user_id: input.user_id, role: input.role_name });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/roles/revoke",
    auth: true,
    permissions: ["users:ban"],
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin");
      if (denied) return denied;
      const { user_id, role_name } = await req.json();
      const db = getAdminClient();
      const { data: role } = await db.from("roles").select("id").eq("name", role_name).single();
      if (!role) return fail("ROLE_NOT_FOUND", "Role not found", 404);
      await db.from("user_roles").delete().eq("user_id", user_id).eq("role_id", role.id);
      await emitAudit(ctx.auth!.userId, "role.revoke", "user", user_id, { role: role_name });
      return ok({ user_id, role: role_name });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/roles",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin", "staff");
      if (denied) return denied;
      const db = getAdminClient();
      const { data: roles } = await db.from("roles").select("id,name,description");
      const { data: permissions } = await db.from("permissions").select("id,name,description");
      return ok({ roles, permissions });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/users/ban",
    auth: true,
    permissions: ["users:ban"],
    handler: async (req, ctx) => {
      const { user_id, reason } = await req.json();
      const db = getAdminClient();
      await db
        .from("user_profiles")
        .update({ banned_at: new Date().toISOString() })
        .eq("user_id", user_id);
      await emitAudit(ctx.auth!.userId, "user.ban", "user", user_id, { reason });
      return ok({ user_id, banned: true });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/users/unban",
    auth: true,
    permissions: ["users:ban"],
    handler: async (req, ctx) => {
      const { user_id } = await req.json();
      const db = getAdminClient();
      await db.from("user_profiles").update({ banned_at: null }).eq("user_id", user_id);
      await emitAudit(ctx.auth!.userId, "user.unban", "user", user_id, {});
      return ok({ user_id, banned: false });
    },
  },
]);
