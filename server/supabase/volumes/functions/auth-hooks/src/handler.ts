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
import { getSelfProfile, updateSelfProfile } from "../../_shared/lib/user-self-profile.ts";
import {
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettingsConfig,
} from "../../_shared/lib/payment-settings.ts";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsConfig,
} from "../../_shared/lib/notification-settings.ts";
import {
  getReferralSettings,
  updateReferralSettings,
  listReferrals,
  listLoyalty,
  listTariffs,
  upsertTariff,
  createTariff,
  deleteTariff,
  listPaychecks,
  createPaycheck,
  updatePaycheckStatus,
  updatePaycheckAmount,
  holdPaycheck,
  resumePaycheck,
  cancelPaycheck,
  deletePaycheck,
  listCheckouts,
  seedDemoFinanceIfEmpty,
} from "../../_shared/lib/finance-admin.ts";
import {
  listTariffSubscriptions,
  createTariffSubscription,
  migrateTariffSubscription,
  holdTariffSubscription,
  resumeTariffSubscription,
  cancelTariffSubscription,
  deleteTariffSubscription,
} from "../../_shared/lib/finance-subscriptions.ts";
import {
  listDriverEarnings,
  adjustDriverEarning,
  queuePaycheckFromEarnings,
} from "../../_shared/lib/finance-driver-earnings.ts";
import {
  listBonusAccounts,
  upsertBonusAccount,
  deleteBonusAccount,
  listLoyaltyEnriched,
  upsertLoyalty,
  listReferralCampaigns,
  createReferralCampaign,
  updateReferralCampaign,
  deleteReferralCampaign,
  getUserIdByEmail,
  getUserEmail,
} from "../../_shared/lib/finance-referrals.ts";
import { listPaymentsAdmin } from "../../_shared/lib/admin-payments.ts";
import {
  listCouponsAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
  listCouponRedemptionsAdmin,
  validateCouponForCheckout,
  redeemCouponAtCheckout,
} from "../../_shared/lib/finance-coupons.ts";
import { z } from "zod";

const couponAdminSchema = z.object({
  code: z.string().min(2).max(32),
  bonus_cad: z.number().min(0),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

const preferencesSchema = z.object({
  appName: z.string().min(1).max(80).optional(),
  timeZone: z.string().min(1).max(64).optional(),
  defaultLanguage: z.string().min(2).max(10).optional(),
  supportedLanguages: z.array(z.string().min(2).max(10)).optional(),
  currency: z.string().min(3).max(3).optional(),
  country: z.string().min(2).max(2).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(32).optional(),
  defaultMapCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
  maxSearchRadiusKm: z.number().min(1).max(500).optional(),
  cancelWindowMinutes: z.number().min(0).max(60).optional(),
  driverAcceptTimeoutSec: z.number().min(10).max(300).optional(),
  scheduledRideEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
});

const selfProfileSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
  display_name: z.string().max(120).optional().nullable(),
  full_name: z.string().max(120).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  avatar_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});

const paymentSettingsSchema = z.object({
  currency: z.string().length(3).optional(),
  stripeMode: z.enum(["test", "live"]).optional(),
  stripePublishableKey: z.string().max(200).optional(),
  platformFeePercent: z.number().min(0).max(50).optional(),
  driverPayoutDelayDays: z.number().min(0).max(30).optional(),
  minTripFare: z.number().min(0).optional(),
  cancellationFee: z.number().min(0).optional(),
  autoCapture: z.boolean().optional(),
  tipsEnabled: z.boolean().optional(),
  requirePreauth: z.boolean().optional(),
});

const notificationEventSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
  }),
  audiences: z.object({
    client: z.boolean(),
    driver: z.boolean(),
    staff: z.boolean(),
  }),
});

const tariffFeaturesSchema = z.object({
  search_priority: z.boolean().optional(),
  search_priority_rank: z.number().min(1).max(9999).optional(),
  promoted_listing: z.boolean().optional(),
  media_gallery: z.boolean().optional(),
  max_photos: z.number().min(0).max(20).optional(),
  max_videos: z.number().min(0).max(5).optional(),
  custom_badge: z.boolean().optional(),
  badge_label: z.string().max(32).optional(),
  priority_support: z.boolean().optional(),
  remove_ads: z.boolean().optional(),
});

const tariffLabelStyleSchema = z.object({
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const tariffCardDisplaySchema = z.object({
  background_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  text_styles: z
    .object({
      mode: z.enum(["auto", "custom"]),
      title: tariffLabelStyleSchema.nullable().optional(),
      commission: tariffLabelStyleSchema.nullable().optional(),
      features: tariffLabelStyleSchema.nullable().optional(),
      subscription: tariffLabelStyleSchema.nullable().optional(),
    })
    .optional(),
  badge: z.object({
    enabled: z.boolean(),
    position: z.enum(["top_left", "top_right", "bottom_left", "bottom_right"]),
    kind: z.enum(["text", "image"]),
    text: z.string().max(24),
    text_background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    blink: z.boolean(),
    image_path: z.string().max(512).nullable().optional(),
  }),
});

const tariffPackageSchema = z.object({
  code: z.string().min(2).max(48).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  package_type: z.enum(["basic", "essential", "pro", "pro_plus", "custom"]),
  description: z.string().max(500).optional().nullable(),
  commission_percent: z.number().min(0).max(50),
  subscription_monthly: z.number().min(0).nullable().optional(),
  recurrence_count: z.number().min(1).nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  min_withdraw_amount: z.number().min(0).optional(),
  payout_label: z.enum(["instant", "days"]).optional(),
  payout_delay_minutes: z.number().min(0).max(525600).optional(),
  payout_delay_days: z.number().min(0).max(365).optional(),
  payout_custom_label: z.string().max(64).nullable().optional(),
  payout_cadence: z.string().min(1).max(64).optional(),
  quota_trips: z.number().min(0).nullable().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  search_boost: z.number().min(0).max(100).optional(),
  is_optional_subscription: z.boolean().optional(),
  billing_mode: z.enum(["subscription", "one_time"]).optional(),
  is_basic: z.boolean().optional(),
  active: z.boolean().optional(),
  features: tariffFeaturesSchema.optional(),
  card_display: tariffCardDisplaySchema.optional(),
});

function canManageMail(auth: AuthLike): boolean {
  return hasPerm(auth, "settings:mail:read") || hasPerm(auth, "email:templates");
}

function canEditMail(auth: AuthLike): boolean {
  return hasPerm(auth, "settings:mail:update") || hasPerm(auth, "email:templates");
}

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
    path: "/v1/me/profile",
    auth: true,
    handler: async (_req, ctx) => {
      try {
        const profile = await getSelfProfile(ctx.auth!.userId);
        return ok({ profile });
      } catch (e) {
        return fail("PROFILE_ERROR", (e as Error).message, 400);
      }
    },
  },
  {
    method: "PATCH",
    path: "/v1/me/profile",
    auth: true,
    handler: async (req, ctx) => {
      try {
        const body = selfProfileSchema.parse(await req.json());
        const profile = await updateSelfProfile(ctx.auth!.userId, body);
        await emitAudit(ctx.auth!.userId, "profile.self_update", "user", ctx.auth!.userId, {});
        return ok({ profile });
      } catch (e) {
        return fail("PROFILE_ERROR", (e as Error).message, 400);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/email-templates",
    auth: true,
    handler: async (_req, ctx) => {
      if (!canManageMail(authLike(ctx))) {
        return fail("FORBIDDEN", "Missing settings:mail:read or email:templates", 403);
      }
      const db = getAdminClient();
      const { data } = await db.from("email_templates").select("*").order("template_key");
      return ok({ templates: data });
    },
  },
  {
    method: "PUT",
    path: "/v1/admin/email-templates/:template_key",
    auth: true,
    handler: async (req, ctx, params) => {
      if (!canEditMail(authLike(ctx))) {
        return fail("FORBIDDEN", "Missing settings:mail:update or email:templates", 403);
      }
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
    path: "/v1/admin/finance/referrals/settings",
    auth: true,
    permissions: ["finances:referrals:read"],
    handler: async () => ok(await getReferralSettings()),
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/referrals/settings",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx) => {
      const body = await req.json();
      const data = await updateReferralSettings(body.client_config ?? {}, body.driver_config ?? {});
      await emitAudit(ctx.auth!.userId, "referral_settings.update", "referral_settings", "default", {});
      return ok(data);
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/referrals",
    auth: true,
    permissions: ["finances:referrals:read"],
    handler: async () => {
      await seedDemoFinanceIfEmpty();
      const [clientBonuses, driverBonuses, loyalty, clientCampaigns, driverCampaigns] =
        await Promise.all([
          listBonusAccounts("client"),
          listBonusAccounts("driver"),
          listLoyaltyEnriched(),
          listReferralCampaigns("client"),
          listReferralCampaigns("driver"),
        ]);
      return ok({
        clientBonuses,
        driverBonuses,
        loyalty,
        clientCampaigns,
        driverCampaigns,
      });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/referrals/bonuses",
    auth: true,
    permissions: ["finances:referrals:read"],
    handler: async (req) => {
      const type = new URL(req.url).searchParams.get("account_type") === "driver" ? "driver" : "client";
      return ok({ bonuses: await listBonusAccounts(type) });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/referrals/bonuses",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          email: z.string().email(),
          account_type: z.enum(["client", "driver"]),
          channel: z.enum(["link", "coupon", "loyalty", "manual"]).optional(),
          balance: z.number().min(0),
        })
        .parse(await req.json());
      const userId = await getUserIdByEmail(body.email);
      if (!userId) return fail("NOT_FOUND", "User not found", 404);
      const row = await upsertBonusAccount({
        user_id: userId,
        account_type: body.account_type,
        channel: body.channel,
        balance: body.balance,
      });
      await emitAudit(ctx.auth!.userId, "bonus.upsert", "bonus_accounts", row.id, {});
      return ok({ bonus: row });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/referrals/bonuses/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          channel: z.enum(["link", "coupon", "loyalty", "manual"]).optional(),
          balance: z.number().min(0).optional(),
        })
        .parse(await req.json());
      const db = getAdminClient();
      const { data, error } = await db
        .from("bonus_accounts")
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq("id", params.id)
        .select()
        .single();
      if (error) return fail("DB_ERROR", error.message, 500);
      return ok({ bonus: { ...data, email: await getUserEmail(data.user_id) } });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/referrals/bonuses/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (_req, ctx, params) => {
      await deleteBonusAccount(params.id);
      await emitAudit(ctx.auth!.userId, "bonus.delete", "bonus_accounts", params.id, {});
      return ok({ deleted: true });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/referrals/loyalty",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          email: z.string().email(),
          points: z.number().min(0),
        })
        .parse(await req.json());
      const userId = await getUserIdByEmail(body.email);
      if (!userId) return fail("NOT_FOUND", "User not found", 404);
      const row = await upsertLoyalty({ user_id: userId, points: body.points });
      await emitAudit(ctx.auth!.userId, "loyalty.upsert", "loyalty_points", userId, {});
      return ok({ loyalty: row });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/referrals/campaigns",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          referrer_email: z.string().email(),
          referrer_role: z.enum(["client", "driver"]),
          invitation_type: z.enum(["client", "driver"]),
          channel: z.enum(["link", "coupon", "manual"]),
          coupon_code: z.string().nullable().optional(),
          condition_required: z.number().min(1),
          target_bonus: z.number().min(0),
          goal: z.enum(["pending", "achieved"]).optional(),
          joined_emails: z.array(z.string().email()).optional(),
        })
        .parse(await req.json());
      const referrerId = await getUserIdByEmail(body.referrer_email);
      if (!referrerId) return fail("NOT_FOUND", "Referrer not found", 404);
      const refereeIds: string[] = [];
      for (const em of body.joined_emails ?? []) {
        const id = await getUserIdByEmail(em);
        if (id) refereeIds.push(id);
      }
      const row = await createReferralCampaign({
        referrer_id: referrerId,
        referrer_role: body.referrer_role,
        invitation_type: body.invitation_type,
        channel: body.channel,
        coupon_code: body.coupon_code,
        condition_required: body.condition_required,
        target_bonus: body.target_bonus,
        goal: body.goal,
        referee_ids: refereeIds,
      });
      await emitAudit(ctx.auth!.userId, "campaign.create", "referral_campaigns", row.id, {});
      return ok({ campaign: row });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/referrals/campaigns/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          channel: z.enum(["link", "coupon", "manual"]).optional(),
          condition_required: z.number().min(1).optional(),
          target_bonus: z.number().min(0).optional(),
          goal: z.enum(["pending", "achieved"]).optional(),
        })
        .parse(await req.json());
      const row = await updateReferralCampaign(params.id, body);
      await emitAudit(ctx.auth!.userId, "campaign.update", "referral_campaigns", params.id, {});
      return ok({ campaign: row });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/referrals/campaigns/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (_req, ctx, params) => {
      await deleteReferralCampaign(params.id);
      await emitAudit(ctx.auth!.userId, "campaign.delete", "referral_campaigns", params.id, {});
      return ok({ deleted: true });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/coupons",
    auth: true,
    permissions: ["finances:referrals:read"],
    handler: async () => {
      const [coupons, redemptions] = await Promise.all([
        listCouponsAdmin(),
        listCouponRedemptionsAdmin(),
      ]);
      return ok({ coupons, redemptions });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/coupons",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx) => {
      const body = couponAdminSchema.parse(await req.json());
      const row = await createCouponAdmin(body);
      await emitAudit(ctx.auth!.userId, "coupon.create", "coupons", row.id, { code: row.code });
      return ok({ coupon: row });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/coupons/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (req, ctx, params) => {
      const body = couponAdminSchema.partial().parse(await req.json());
      const row = await updateCouponAdmin(params.id, body);
      await emitAudit(ctx.auth!.userId, "coupon.update", "coupons", params.id, {});
      return ok({ coupon: row });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/coupons/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: async (_req, ctx, params) => {
      await deleteCouponAdmin(params.id);
      await emitAudit(ctx.auth!.userId, "coupon.delete", "coupons", params.id, {});
      return ok({ deleted: true });
    },
  },
  {
    method: "POST",
    path: "/v1/finance/coupons/validate",
    auth: true,
    handler: async (req, ctx) => {
      const body = z
        .object({ code: z.string().min(1), fare: z.number().min(0).optional() })
        .parse(await req.json());
      const result = await validateCouponForCheckout(
        body.code,
        ctx.auth!.userId,
        body.fare ?? 0,
      );
      if (!result.ok) return fail(result.error, result.message, 422);
      return ok({
        code: result.coupon.code,
        bonus_cad: result.bonus_cad,
        discount: result.discount,
      });
    },
  },
  {
    method: "POST",
    path: "/v1/finance/coupons/redeem",
    auth: true,
    handler: async (req, ctx) => {
      const body = z
        .object({ code: z.string().min(1), trip_id: z.string().uuid().nullable().optional() })
        .parse(await req.json());
      try {
        const result = await redeemCouponAtCheckout(body.code, ctx.auth!.userId, body.trip_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Redeem failed";
        return fail("COUPON_REDEEM_FAILED", msg, 422);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:read"],
    handler: async () => ok({ packages: await listTariffs() }),
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: async (req, ctx) => {
      const body = tariffPackageSchema.parse(await req.json());
      const row = await createTariff(body);
      await emitAudit(ctx.auth!.userId, "tariff.create", "driver_tariff_packages", row.id, { code: body.code });
      return ok({ package: row });
    },
  },
  {
    method: "PUT",
    path: "/v1/admin/finance/tariffs/:id",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: async (req, ctx, params) => {
      const body = tariffPackageSchema.parse(await req.json());
      const row = await upsertTariff({ ...body, id: params.id });
      await emitAudit(ctx.auth!.userId, "tariff.update", "driver_tariff_packages", params.id, {});
      return ok({ package: row });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/tariffs/:id",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: async (_req, ctx, params) => {
      await deleteTariff(params.id);
      await emitAudit(ctx.auth!.userId, "tariff.delete", "driver_tariff_packages", params.id, {});
      return ok({ deleted: true });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: async (req) => {
      await seedDemoFinanceIfEmpty();
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ paychecks: await listPaychecks(status) });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          driver_id: z.string().uuid(),
          amount: z.number().positive(),
          period_label: z.string().optional(),
          note: z.string().optional(),
        })
        .parse(await req.json());
      const row = await createPaycheck(body);
      await emitAudit(ctx.auth!.userId, "paycheck.create", "driver_paychecks", row.id, body);
      return ok({ paycheck: row });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/paychecks/:id",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          status: z.enum(["pending", "paid", "held", "cancelled"]).optional(),
          amount: z.number().positive().optional(),
          action: z.enum(["hold", "resume", "cancel", "pay"]).optional(),
          reason: z.string().max(2000).optional(),
          notify: z.boolean().optional(),
        })
        .parse(await req.json());

      let row;
      if (body.action === "hold") {
        row = await holdPaycheck(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "resume") {
        row = await resumePaycheck(params.id, { notify: body.notify ?? true });
      } else if (body.action === "cancel") {
        row = await cancelPaycheck(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "pay" || body.status === "paid") {
        row = await updatePaycheckStatus(params.id, "paid", ctx.auth!.userId);
      } else if (body.amount != null) {
        row = await updatePaycheckAmount(params.id, body.amount);
      } else if (body.status) {
        row = await updatePaycheckStatus(params.id, body.status, ctx.auth!.userId);
      } else {
        return fail("VALIDATION", "No update specified", 400);
      }
      await emitAudit(ctx.auth!.userId, "paycheck.update", "driver_paychecks", params.id, body);
      return ok({ paycheck: row });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/paychecks/:id",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: async (_req, ctx, params) => {
      const result = await deletePaycheck(params.id);
      await emitAudit(ctx.auth!.userId, "paycheck.delete", "driver_paychecks", params.id, result);
      return ok(result);
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ subscriptions: await listTariffSubscriptions(status) });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: async (req, ctx) => {
      const body = z
        .object({
          driver_id: z.string().uuid(),
          tariff_package_id: z.string().uuid(),
          notify: z.boolean().optional(),
        })
        .parse(await req.json());
      const row = await createTariffSubscription(body);
      await emitAudit(ctx.auth!.userId, "subscription.create", "driver_tariff_subscriptions", row.id, body);
      return ok({ subscription: row });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/tariff-subscriptions/:id",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          action: z.enum(["hold", "resume", "cancel", "migrate"]),
          reason: z.string().max(2000).optional(),
          notify: z.boolean().optional(),
          tariff_package_id: z.string().uuid().optional(),
        })
        .parse(await req.json());
      let row;
      if (body.action === "hold") {
        row = await holdTariffSubscription(params.id, { reason: body.reason, notify: body.notify ?? true });
      } else if (body.action === "resume") {
        row = await resumeTariffSubscription(params.id, { notify: body.notify ?? true });
      } else if (body.action === "migrate") {
        if (!body.tariff_package_id) throw new Error("tariff_package_id required for migrate");
        const db = getAdminClient();
        const { data: sub } = await db
          .from("driver_tariff_subscriptions")
          .select("driver_id")
          .eq("id", params.id)
          .single();
        if (!sub) throw new Error("Subscription not found");
        row = await migrateTariffSubscription({
          driver_id: String(sub.driver_id),
          tariff_package_id: body.tariff_package_id,
          notify: body.notify ?? true,
        });
      } else {
        row = await cancelTariffSubscription(params.id, { reason: body.reason, notify: body.notify ?? true });
      }
      await emitAudit(ctx.auth!.userId, "subscription.update", "driver_tariff_subscriptions", params.id, body);
      return ok({ subscription: row });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/driver-earnings",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: async () => ok({ earnings: await listDriverEarnings() }),
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/driver-earnings/:driverId",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: async (req, ctx, params) => {
      const body = z
        .object({
          delta: z.number().optional(),
          balance: z.number().min(0).optional(),
        })
        .parse(await req.json());
      const row = await adjustDriverEarning(params.driverId, body.delta ?? 0, body.balance);
      await emitAudit(ctx.auth!.userId, "driver_earnings.adjust", "driver_earnings", params.driverId, body);
      return ok({ earning: row });
    },
  },
  {
    method: "POST",
    path: "/v1/admin/finance/driver-earnings/:driverId/queue-paycheck",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: async (req, ctx, params) => {
      const body = z.object({ amount: z.number().positive() }).parse(await req.json());
      const paycheck = await queuePaycheckFromEarnings(params.driverId, body.amount);
      await emitAudit(ctx.auth!.userId, "paycheck.create", "driver_paychecks", paycheck.id, body);
      return ok({ paycheck });
    },
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/tariff-subscriptions/:id",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: async (_req, ctx, params) => {
      const result = await deleteTariffSubscription(params.id);
      await emitAudit(ctx.auth!.userId, "subscription.delete", "driver_tariff_subscriptions", params.id, result);
      return ok(result);
    },
  },
  {
    method: "GET",
    path: "/v1/admin/finance/checkouts",
    auth: true,
    permissions: ["finances:checkouts:read"],
    handler: async (req) => {
      await seedDemoFinanceIfEmpty();
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return ok({ sessions: await listCheckouts(status) });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/payments",
    auth: true,
    permissions: ["payments:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 200);
      const payments = await listPaymentsAdmin({ status, limit });
      return ok({ payments });
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
    permissions: ["settings:read"],
    handler: async () => {
      const preferences = await getPlatformPreferences();
      return ok({ preferences });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings",
    auth: true,
    permissions: ["settings:update"],
    handler: async (req, ctx) => {
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
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:read"],
    handler: async () => {
      const config = await getPaymentSettings();
      return ok({ config });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:update"],
    handler: async (req, ctx) => {
      const body = paymentSettingsSchema.parse(await req.json());
      const config = await updatePaymentSettings(
        body as Partial<PaymentSettingsConfig>,
        ctx.auth!.userId,
      );
      await emitAudit(ctx.auth!.userId, "payment_settings.update", "payment_settings", "default", body);
      return ok({ config });
    },
  },
  {
    method: "GET",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:read"],
    handler: async () => {
      const config = await getNotificationSettings();
      return ok({ config });
    },
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:update"],
    handler: async (req, ctx) => {
      const body = z.object({ events: z.array(notificationEventSchema) }).parse(await req.json());
      const config = await updateNotificationSettings(
        body as NotificationSettingsConfig,
        ctx.auth!.userId,
      );
      await emitAudit(
        ctx.auth!.userId,
        "notification_settings.update",
        "notification_settings",
        "default",
        body,
      );
      return ok({ config });
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
