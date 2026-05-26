import { createServiceRouter } from "../../../_shared/core/router.ts";
import { ok, fail } from "../../../_shared/core/response.ts";
import { getAdminClient } from "../../../_shared/lib/supabase.ts";
import { env } from "../../../_shared/lib/env.ts";
import { verifyServiceSignature } from "../../../_shared/middleware/service-auth.ts";
import { requirePermission, requireRole } from "../../../_shared/middleware/auth.ts";
import { emitAudit } from "../../../_shared/lib/events.ts";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from "../../../_shared/lib/password-reset.ts";
import { getAdminDashboard } from "../../../_shared/lib/admin-dashboard.ts";
import {
  listAdminUsers,
  createClientUser,
  updateClientUser,
  getAdminUserDetail,
  deleteAdminUser,
} from "../../../_shared/lib/admin-users.ts";
import {
  listPermissionsCatalog,
  listRolesWithPermissions,
  listAssignableRoles,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
} from "../../../_shared/lib/rbac-admin.ts";
import {
  listDrivers,
  getDriverDetail,
  createDriverManual,
  reviewDriverDocument,
} from "../../../_shared/lib/admin-drivers.ts";
import { hasPerm, hasPermPrefix, type AuthLike } from "../../../_shared/lib/dynamic-rbac.ts";
import {
  getPlatformPreferences,
  updatePlatformPreferences,
  type PlatformPreferences,
} from "../../../_shared/lib/platform-settings.ts";
import { getSelfProfile, updateSelfProfile } from "../../../_shared/lib/user-self-profile.ts";
import {
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettingsConfig,
} from "../../../_shared/lib/payment-settings.ts";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsConfig,
} from "../../../_shared/lib/notification-settings.ts";
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
} from "../../../_shared/lib/finance-admin.ts";
import {
  createAdminTask,
  deleteAdminTask,
  listAdminTasks,
  runAdminTaskNow,
  setAdminTaskPaused,
} from "../../../_shared/lib/admin-tasks.ts";
import {
  getFeedbackAnalytics,
  parseFeedbackCategory,
  parseFeedbackGranularity,
} from "../../../_shared/lib/admin-feedbacks.ts";
import { getAdminAnalytics, type AnalyticsAudience, type AnalyticsPeriod } from "../../../_shared/lib/admin-analytics.ts";
import { withUpdatedByEmail } from "../../../_shared/lib/user-emails.ts";
import { listOnlineDrivers, searchPlaces } from "../../../_shared/lib/admin-map.ts";
import {
  deleteCheckoutSession,
  scheduleCheckoutRecovery,
} from "../../../_shared/lib/finance-checkouts.ts";
import {
  listTariffSubscriptions,
  createTariffSubscription,
  migrateTariffSubscription,
  holdTariffSubscription,
  resumeTariffSubscription,
  cancelTariffSubscription,
  deleteTariffSubscription,
} from "../../../_shared/lib/finance-subscriptions.ts";
import {
  listDriverEarnings,
  adjustDriverEarning,
  queuePaycheckFromEarnings,
} from "../../../_shared/lib/finance-driver-earnings.ts";
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
} from "../../../_shared/lib/finance-referrals.ts";
import { listPaymentsAdmin } from "../../../_shared/lib/admin-payments.ts";
import {
  listCouponsAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
  listCouponRedemptionsAdmin,
  validateCouponForCheckout,
  redeemCouponAtCheckout,
} from "../../../_shared/lib/finance-coupons.ts";
import { z } from "zod";
export { z };
export * from "../schemas/validators.ts";

export { createServiceRouter } from "../../../_shared/core/router.ts";
export { ok } from "../../../_shared/core/response.ts";
export { fail } from "../../../_shared/core/response.ts";
export { getAdminClient } from "../../../_shared/lib/supabase.ts";
export { env } from "../../../_shared/lib/env.ts";
export { verifyServiceSignature } from "../../../_shared/middleware/service-auth.ts";
export { requirePermission } from "../../../_shared/middleware/auth.ts";
export { requireRole } from "../../../_shared/middleware/auth.ts";
export { emitAudit } from "../../../_shared/lib/events.ts";
export { completePasswordReset } from "../../../_shared/lib/password-reset.ts";
export { requestPasswordReset } from "../../../_shared/lib/password-reset.ts";
export { verifyPasswordResetOtp } from "../../../_shared/lib/password-reset.ts";
export { getAdminDashboard } from "../../../_shared/lib/admin-dashboard.ts";
export { listAdminUsers } from "../../../_shared/lib/admin-users.ts";
export { createClientUser } from "../../../_shared/lib/admin-users.ts";
export { updateClientUser } from "../../../_shared/lib/admin-users.ts";
export { getAdminUserDetail } from "../../../_shared/lib/admin-users.ts";
export { deleteAdminUser } from "../../../_shared/lib/admin-users.ts";
export { listPermissionsCatalog } from "../../../_shared/lib/rbac-admin.ts";
export { listRolesWithPermissions } from "../../../_shared/lib/rbac-admin.ts";
export { listAssignableRoles } from "../../../_shared/lib/rbac-admin.ts";
export { createRole } from "../../../_shared/lib/rbac-admin.ts";
export { updateRole } from "../../../_shared/lib/rbac-admin.ts";
export { deleteRole } from "../../../_shared/lib/rbac-admin.ts";
export { assignRoleToUser } from "../../../_shared/lib/rbac-admin.ts";
export { listDrivers } from "../../../_shared/lib/admin-drivers.ts";
export { getDriverDetail } from "../../../_shared/lib/admin-drivers.ts";
export { createDriverManual } from "../../../_shared/lib/admin-drivers.ts";
export { reviewDriverDocument } from "../../../_shared/lib/admin-drivers.ts";
export { hasPerm } from "../../../_shared/lib/dynamic-rbac.ts";
export { hasPermPrefix } from "../../../_shared/lib/dynamic-rbac.ts";
export { getPlatformPreferences } from "../../../_shared/lib/platform-settings.ts";
export { updatePlatformPreferences } from "../../../_shared/lib/platform-settings.ts";
export { getSelfProfile } from "../../../_shared/lib/user-self-profile.ts";
export { updateSelfProfile } from "../../../_shared/lib/user-self-profile.ts";
export { getPaymentSettings } from "../../../_shared/lib/payment-settings.ts";
export { updatePaymentSettings } from "../../../_shared/lib/payment-settings.ts";
export { getNotificationSettings } from "../../../_shared/lib/notification-settings.ts";
export { updateNotificationSettings } from "../../../_shared/lib/notification-settings.ts";
export { getReferralSettings } from "../../../_shared/lib/finance-admin.ts";
export { updateReferralSettings } from "../../../_shared/lib/finance-admin.ts";
export { listReferrals } from "../../../_shared/lib/finance-admin.ts";
export { listLoyalty } from "../../../_shared/lib/finance-admin.ts";
export { listTariffs } from "../../../_shared/lib/finance-admin.ts";
export { upsertTariff } from "../../../_shared/lib/finance-admin.ts";
export { createTariff } from "../../../_shared/lib/finance-admin.ts";
export { deleteTariff } from "../../../_shared/lib/finance-admin.ts";
export { listPaychecks } from "../../../_shared/lib/finance-admin.ts";
export { createPaycheck } from "../../../_shared/lib/finance-admin.ts";
export { updatePaycheckStatus } from "../../../_shared/lib/finance-admin.ts";
export { updatePaycheckAmount } from "../../../_shared/lib/finance-admin.ts";
export { holdPaycheck } from "../../../_shared/lib/finance-admin.ts";
export { resumePaycheck } from "../../../_shared/lib/finance-admin.ts";
export { cancelPaycheck } from "../../../_shared/lib/finance-admin.ts";
export { deletePaycheck } from "../../../_shared/lib/finance-admin.ts";
export { listCheckouts } from "../../../_shared/lib/finance-admin.ts";
export { seedDemoFinanceIfEmpty } from "../../../_shared/lib/finance-admin.ts";
export { createAdminTask } from "../../../_shared/lib/admin-tasks.ts";
export { deleteAdminTask } from "../../../_shared/lib/admin-tasks.ts";
export { listAdminTasks } from "../../../_shared/lib/admin-tasks.ts";
export { runAdminTaskNow } from "../../../_shared/lib/admin-tasks.ts";
export { setAdminTaskPaused } from "../../../_shared/lib/admin-tasks.ts";
export { getFeedbackAnalytics } from "../../../_shared/lib/admin-feedbacks.ts";
export { parseFeedbackCategory } from "../../../_shared/lib/admin-feedbacks.ts";
export { parseFeedbackGranularity } from "../../../_shared/lib/admin-feedbacks.ts";
export { getAdminAnalytics } from "../../../_shared/lib/admin-analytics.ts";
export { withUpdatedByEmail } from "../../../_shared/lib/user-emails.ts";
export { listOnlineDrivers } from "../../../_shared/lib/admin-map.ts";
export { searchPlaces } from "../../../_shared/lib/admin-map.ts";
export { deleteCheckoutSession } from "../../../_shared/lib/finance-checkouts.ts";
export { scheduleCheckoutRecovery } from "../../../_shared/lib/finance-checkouts.ts";
export { listTariffSubscriptions } from "../../../_shared/lib/finance-subscriptions.ts";
export { createTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { migrateTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { holdTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { resumeTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { cancelTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { deleteTariffSubscription } from "../../../_shared/lib/finance-subscriptions.ts";
export { listDriverEarnings } from "../../../_shared/lib/finance-driver-earnings.ts";
export { adjustDriverEarning } from "../../../_shared/lib/finance-driver-earnings.ts";
export { queuePaycheckFromEarnings } from "../../../_shared/lib/finance-driver-earnings.ts";
export { listBonusAccounts } from "../../../_shared/lib/finance-referrals.ts";
export { upsertBonusAccount } from "../../../_shared/lib/finance-referrals.ts";
export { deleteBonusAccount } from "../../../_shared/lib/finance-referrals.ts";
export { listLoyaltyEnriched } from "../../../_shared/lib/finance-referrals.ts";
export { upsertLoyalty } from "../../../_shared/lib/finance-referrals.ts";
export { listReferralCampaigns } from "../../../_shared/lib/finance-referrals.ts";
export { createReferralCampaign } from "../../../_shared/lib/finance-referrals.ts";
export { updateReferralCampaign } from "../../../_shared/lib/finance-referrals.ts";
export { deleteReferralCampaign } from "../../../_shared/lib/finance-referrals.ts";
export { getUserIdByEmail } from "../../../_shared/lib/finance-referrals.ts";
export { getUserEmail } from "../../../_shared/lib/finance-referrals.ts";
export { listPaymentsAdmin } from "../../../_shared/lib/admin-payments.ts";
export { listCouponsAdmin } from "../../../_shared/lib/finance-coupons.ts";
export { createCouponAdmin } from "../../../_shared/lib/finance-coupons.ts";
export { updateCouponAdmin } from "../../../_shared/lib/finance-coupons.ts";
export { deleteCouponAdmin } from "../../../_shared/lib/finance-coupons.ts";
export { listCouponRedemptionsAdmin } from "../../../_shared/lib/finance-coupons.ts";
export { validateCouponForCheckout } from "../../../_shared/lib/finance-coupons.ts";
export { redeemCouponAtCheckout } from "../../../_shared/lib/finance-coupons.ts";
