import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { env } from "../../_shared/lib/env.ts";
import { verifyServiceSignature } from "../../_shared/middleware/service-auth.ts";
import { requirePermission, requireRole } from "../../_shared/middleware/auth.ts";
import { emitAudit } from "../../_shared/lib/events.ts";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from "../../_shared/lib/password-reset.ts";
import { getAdminDashboard } from "../../_shared/lib/admin-dashboard.ts";
import {
  listAdminUsers,
  createClientUser,
  updateClientUser,
  getAdminUserDetail,
  deleteAdminUser,
} from "../../_shared/lib/admin-users.ts";
import {
  listPermissionsCatalog,
  listRolesWithPermissions,
  listAssignableRoles,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
} from "../../_shared/lib/rbac-admin.ts";
import {
  listDrivers,
  getDriverDetail,
  createDriverManual,
  reviewDriverDocument,
} from "../../_shared/lib/admin-drivers.ts";
import { hasPerm, hasPermPrefix, type AuthLike } from "../../_shared/lib/dynamic-rbac.ts";
import {
  getPlatformPreferences,
  updatePlatformPreferences,
  type PlatformPreferences,
} from "../../_shared/lib/platform-settings.ts";
import { z } from "zod";

const preferencesSchema = z.object({
  appName: z.string().min(1).max(80).optional(),
  timeZone: z.string().min(1).max(64).optional(),
  defaultLanguage: z.string().min(2).max(10).optional(),
  supportedLanguages: z.array(z.string().min(2).max(10)).optional(),
  currency: z.string().min(3).max(3).optional(),
  country: z.string().min(2).max(2).optional(),
});

const emailOnlySchema = z.object({ email: z.string().email() });
const verifyOtpSchema = z.object({ email: z.string().email(), code: z.string().length(6) });
const resetPasswordSchema = z.object({
  email: z.string().email(),
  reset_token: z.string().min(16),
  password: z.string().min(8),
});

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
});

const createRoleSchema = z.object({
  name: z.string().min(2).max(48),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string().min(1)),
});

const updateRoleSchema = z.object({
  description: z.string().max(200).optional(),
  permissions: z.array(z.string().min(1)).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().max(120).optional(),
});

const createDriverSchema = createUserSchema.extend({
  phone: z.string().max(32).optional(),
});

const docReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(500).optional(),
});

function authLike(ctx: { auth?: AuthLike }): AuthLike {
  return ctx.auth!;
}

export const handle = createServiceRouter("auth-hooks", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "auth-hooks" }),
  },
  {
    method: "POST",
    path: "/v1/auth/forgot-password",
    auth: false,
    handler: async (req) => {
      const { email } = emailOnlySchema.parse(await req.json());
      const result = await requestPasswordReset(email);
      return ok(result);
    },
  },
  {
    method: "POST",
    path: "/v1/auth/verify-reset-otp",
    auth: false,
    handler: async (req) => {
      const { email, code } = verifyOtpSchema.parse(await req.json());
      const result = await verifyPasswordResetOtp(email, code);
      if (!result.ok) return fail(result.error, result.message, 400);
      return ok({
        reset_token: result.reset_token,
        expires_minutes: result.expires_minutes,
      });
    },
  },
  {
    method: "POST",
    path: "/v1/auth/reset-password",
    auth: false,
    handler: async (req) => {
      const body = resetPasswordSchema.parse(await req.json());
      const result = await completePasswordReset(body.email, body.reset_token, body.password);
      if (!result.ok) return fail(result.error, result.message, 400);
      return ok({ message: result.message });
    },
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
    handler: async (req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "staff:update") && !hasPerm(actor, "roles:update")) {
        return fail("FORBIDDEN", "Missing staff:update or roles:update", 403);
      }
      const input = assignRoleSchema.parse(await req.json());
      try {
        const result = await assignRoleToUser(actor, input.user_id, input.role_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Assign failed";
        return fail("FORBIDDEN", msg, msg === "Role not found" ? 404 : 403);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/admin/roles/revoke",
    auth: true,
    handler: async (req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "staff:delete") && !hasPerm(actor, "staff:update")) {
        return fail("FORBIDDEN", "Missing staff:delete", 403);
      }
      const { user_id, role_id } = z
        .object({ user_id: z.string().uuid(), role_id: z.string().uuid() })
        .parse(await req.json());
      const db = getAdminClient();
      await db.from("user_roles").delete().eq("user_id", user_id).eq("role_id", role_id);
      await emitAudit(actor.userId, "role.revoke", "user", user_id, { role_id });
      return ok({ user_id, role_id });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/permissions",
    auth: true,
    handler: async (_req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "roles:read") && !hasPermPrefix(actor, "staff:")) {
        return fail("FORBIDDEN", "Missing roles:read", 403);
      }
      const catalog = await listPermissionsCatalog();
      return ok(catalog);
    },
  },
  {
    method: "GET",
    path: "/v1/admin/roles",
    auth: true,
    handler: async (_req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "roles:read") && !hasPermPrefix(actor, "staff:")) {
        return fail("FORBIDDEN", "Missing roles:read", 403);
      }
      const [roles, catalog, assignable_roles] = await Promise.all([
        listRolesWithPermissions(),
        listPermissionsCatalog(),
        listAssignableRoles(actor),
      ]);
      return ok({
        roles,
        permissions: catalog.permissions,
        grouped: catalog.grouped,
        assignable_roles,
      });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/roles",
    auth: true,
    handler: async (req, ctx) => {
      const body = createRoleSchema.parse(await req.json());
      try {
        const role = await createRole(authLike(ctx), body);
        return ok({ role });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/roles/:role_id",
    auth: true,
    handler: async (req, ctx, params) => {
      const body = updateRoleSchema.parse(await req.json());
      try {
        const role = await updateRole(authLike(ctx), params.role_id, body);
        return ok({ role });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/roles/:role_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      try {
        const result = await deleteRole(authLike(ctx), params.role_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/rbac/me",
    auth: true,
    handler: async (_req, ctx) => {
      const actor = authLike(ctx);
      const assignable_roles = await listAssignableRoles(actor);
      return ok({
        roles: actor.roles,
        permissions: actor.permissions,
        assignable_roles,
        can_manage_staff:
          hasPermPrefix(actor, "staff:") ||
          hasPerm(actor, "roles:create") ||
          hasPerm(actor, "roles:update"),
      });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/users",
    auth: true,
    handler: async (req, ctx) => {
      const url = new URL(req.url);
      const kind = (url.searchParams.get("kind") ?? "clients") as "clients" | "drivers" | "staff" | "all";
      const actor = authLike(ctx);
      if (kind === "clients" && !hasPerm(actor, "users:read")) {
        return fail("FORBIDDEN", "Missing users:read", 403);
      }
      if (kind === "drivers" && !hasPerm(actor, "drivers:read")) {
        return fail("FORBIDDEN", "Missing drivers:read", 403);
      }
      if (kind === "staff" && !hasPerm(actor, "staff:read") && !hasPerm(actor, "roles:read")) {
        return fail("FORBIDDEN", "Missing staff:read", 403);
      }
      const users = await listAdminUsers({ kind, limit: 150 });
      return ok({ users });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/users",
    auth: true,
    handler: async (req, ctx) => {
      const body = createUserSchema.parse(await req.json());
      try {
        const user = await createClientUser(authLike(ctx), body);
        return ok({ user });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      const actor = authLike(ctx);
      const user = await getAdminUserDetail(params.user_id);
      if (!user) return fail("NOT_FOUND", "User not found", 404);
      const canRead =
        hasPerm(actor, "users:read") ||
        hasPerm(actor, "staff:read") ||
        hasPerm(actor, "drivers:read");
      if (!canRead) return fail("FORBIDDEN", "Missing permission", 403);
      return ok({ user });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          full_name: z.string().max(120).optional(),
          email: z.string().email().optional(),
        })
        .parse(await req.json());
      try {
        const user = await updateClientUser(authLike(ctx), params.user_id, body);
        return ok({ user });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: async (req, ctx, params) => {
      const body = z
        .object({ mode: z.enum(["soft", "permanent"]).default("soft") })
        .parse(await req.json().catch(() => ({ mode: "soft" })));
      try {
        const result = await deleteAdminUser(authLike(ctx), params.user_id, body.mode);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        const code = msg === "NOT_FOUND" ? 404 : 403;
        return fail(code === 404 ? "NOT_FOUND" : "FORBIDDEN", msg, code);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/drivers",
    auth: true,
    permissions: ["drivers:read"],
    handler: async () => {
      const drivers = await listDrivers();
      return ok({ drivers });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/drivers/:driver_id",
    auth: true,
    permissions: ["drivers:read"],
    handler: async (_req, _ctx, params) => {
      const driver = await getDriverDetail(params.driver_id);
      if (!driver) return fail("NOT_FOUND", "Driver not found", 404);
      return ok({ driver });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/drivers",
    auth: true,
    handler: async (req, ctx) => {
      const body = createDriverSchema.parse(await req.json());
      try {
        const driver = await createDriverManual(authLike(ctx), body);
        return ok({ driver });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/admin/drivers/:driver_id/documents/:doc_type/review",
    auth: true,
    handler: async (req, ctx, params) => {
      const body = docReviewSchema.parse(await req.json());
      try {
        const driver = await reviewDriverDocument(
          authLike(ctx),
          params.driver_id,
          params.doc_type,
          body.status,
          body.rejection_reason,
        );
        return ok({ driver });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Review failed";
        return fail("FORBIDDEN", msg, 403);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/trips",
    auth: true,
    permissions: ["rides:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const db = getAdminClient();
      const { data } = await db
        .from("trip_requests")
        .select("id,status,created_at,pickup_address,dropoff_address,client_id,driver_id,fare_estimate")
        .order("created_at", { ascending: false })
        .limit(limit);
      return ok({ trips: data ?? [] });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/payments",
    auth: true,
    permissions: ["audit:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const db = getAdminClient();
      const { data } = await db
        .from("payment_intents")
        .select("id,amount,currency,status,created_at,trip_id,client_id")
        .order("created_at", { ascending: false })
        .limit(limit);
      return ok({ payments: data ?? [] });
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
  {
    method: "GET",
    path: "/v1/settings/public",
    auth: false,
    handler: async () => {
      const preferences = await getPlatformPreferences();
      return ok({
        appName: preferences.appName,
        defaultLanguage: preferences.defaultLanguage,
        supportedLanguages: preferences.supportedLanguages,
      });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/settings",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin");
      if (denied) return denied;
      const preferences = await getPlatformPreferences();
      return ok({ preferences });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "super_admin", "admin");
      if (denied) return denied;
      const body = preferencesSchema.parse(await req.json());
      const preferences = await updatePlatformPreferences(
        body as Partial<PlatformPreferences>,
        ctx.auth!.userId,
      );
      await emitAudit(ctx.auth!.userId, "platform_settings.update", "platform_settings", "default", body);
      return ok({ preferences });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/dashboard",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(
        ctx.auth!,
        "super_admin",
        "admin",
        "staff",
        "moderator",
        "agent",
        "support",
      );
      if (denied) return denied;
      const dashboard = await getAdminDashboard();
      return ok(dashboard);
    },
  },
]);
