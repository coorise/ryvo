import { z } from "zod";
import type { AuthLike } from "../../../_shared/lib/dynamic-rbac.ts";
import { hasPerm } from "../../../_shared/lib/dynamic-rbac.ts";


export const couponAdminSchema = z.object({
  code: z.string().min(2).max(32),
  bonus_cad: z.number().min(0),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const preferencesSchema = z.object({
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

export const selfProfileSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
  display_name: z.string().max(120).optional().nullable(),
  full_name: z.string().max(120).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  avatar_url: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});

export const paymentSettingsSchema = z.object({
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

export const notificationEventSchema = z.object({
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

export const tariffPackageSchema = z.object({
  code: z.string().min(2).max(48).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  package_type: z.enum(["basic", "essential", "pro", "pro_plus", "custom"]),
  description: z.string().max(500).optional().nullable(),
  commission_percent: z.number().min(0).max(50),
  subscription_monthly: z.number().min(0).nullable().optional(),
  recurrence_count: z.number().min(1).nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  min_withdraw_amount: z.number().min(0).optional(),
  max_withdraw_amount: z.number().min(0).nullable().optional(),
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

export function canManageMail(auth: AuthLike): boolean {
  return hasPerm(auth, "settings:mail:read") || hasPerm(auth, "email:templates");
}

export function canEditMail(auth: AuthLike): boolean {
  return hasPerm(auth, "settings:mail:update") || hasPerm(auth, "email:templates");
}

export const emailOnlySchema = z.object({ email: z.string().email() });
export const verifyOtpSchema = z.object({ email: z.string().email(), code: z.string().length(6) });
export const resetPasswordSchema = z.object({
  email: z.string().email(),
  reset_token: z.string().min(16),
  password: z.string().min(8),
});

export const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
});

export const createRoleSchema = z.object({
  name: z.string().min(2).max(48),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string().min(1)),
});

export const updateRoleSchema = z.object({
  description: z.string().max(200).optional(),
  permissions: z.array(z.string().min(1)).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().max(120).optional(),
});

export const createDriverSchema = createUserSchema.extend({
  phone: z.string().max(32).optional(),
});

export const docReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(500).optional(),
});

export function authLike(ctx: { auth?: AuthLike }): AuthLike {
  return ctx.auth!;
}
