#!/usr/bin/env python3
"""One-off generator: split src/handler.ts routes into src/api/<group>/route.ts."""
from __future__ import annotations

import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
HANDLER = ROOT / "src" / "handler.ts"

# Everything route modules may reference (values + z + types used in bodies)
VALUE_TOKENS = [
    "ok",
    "fail",
    "getAdminClient",
    "env",
    "verifyServiceSignature",
    "requirePermission",
    "requireRole",
    "emitAudit",
    "completePasswordReset",
    "requestPasswordReset",
    "verifyPasswordResetOtp",
    "listAdminUsers",
    "createClientUser",
    "updateClientUser",
    "getAdminUserDetail",
    "deleteAdminUser",
    "listPermissionsCatalog",
    "listRolesWithPermissions",
    "listAssignableRoles",
    "createRole",
    "updateRole",
    "deleteRole",
    "assignRoleToUser",
    "listDrivers",
    "getDriverDetail",
    "createDriverManual",
    "reviewDriverDocument",
    "hasPerm",
    "hasPermPrefix",
    "getPlatformPreferences",
    "updatePlatformPreferences",
    "getSelfProfile",
    "updateSelfProfile",
    "getPaymentSettings",
    "updatePaymentSettings",
    "getNotificationSettings",
    "updateNotificationSettings",
    "getReferralSettings",
    "updateReferralSettings",
    "listReferrals",
    "listLoyalty",
    "listTariffs",
    "upsertTariff",
    "createTariff",
    "deleteTariff",
    "listPaychecks",
    "createPaycheck",
    "updatePaycheckStatus",
    "updatePaycheckAmount",
    "holdPaycheck",
    "resumePaycheck",
    "cancelPaycheck",
    "deletePaycheck",
    "listCheckouts",
    "seedDemoFinanceIfEmpty",
    "createAdminTask",
    "deleteAdminTask",
    "listAdminTasks",
    "runAdminTaskNow",
    "setAdminTaskPaused",
    "getFeedbackAnalytics",
    "parseFeedbackCategory",
    "parseFeedbackGranularity",
    "getAdminAnalytics",
    "withUpdatedByEmail",
    "listOnlineDrivers",
    "searchPlaces",
    "deleteCheckoutSession",
    "scheduleCheckoutRecovery",
    "listTariffSubscriptions",
    "createTariffSubscription",
    "migrateTariffSubscription",
    "holdTariffSubscription",
    "resumeTariffSubscription",
    "cancelTariffSubscription",
    "deleteTariffSubscription",
    "listDriverEarnings",
    "adjustDriverEarning",
    "queuePaycheckFromEarnings",
    "listBonusAccounts",
    "upsertBonusAccount",
    "deleteBonusAccount",
    "listLoyaltyEnriched",
    "upsertLoyalty",
    "listReferralCampaigns",
    "createReferralCampaign",
    "updateReferralCampaign",
    "deleteReferralCampaign",
    "getUserIdByEmail",
    "getUserEmail",
    "listPaymentsAdmin",
    "listCouponsAdmin",
    "createCouponAdmin",
    "updateCouponAdmin",
    "deleteCouponAdmin",
    "listCouponRedemptionsAdmin",
    "validateCouponForCheckout",
    "redeemCouponAtCheckout",
    "getAdminDashboard",
    "z",
    "couponAdminSchema",
    "preferencesSchema",
    "selfProfileSchema",
    "paymentSettingsSchema",
    "notificationEventSchema",
    "tariffPackageSchema",
    "emailOnlySchema",
    "verifyOtpSchema",
    "resetPasswordSchema",
    "assignRoleSchema",
    "createRoleSchema",
    "updateRoleSchema",
    "createUserSchema",
    "createDriverSchema",
    "docReviewSchema",
    "authLike",
    "canManageMail",
    "canEditMail",
]

TYPE_TOKENS = [
    "PlatformPreferences",
    "PaymentSettingsConfig",
    "NotificationSettingsConfig",
    "AnalyticsAudience",
    "AnalyticsPeriod",
]


def token_pat(name: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![\w$.]){re.escape(name)}(?![\w])")


def used_names(chunk: str, names: list[str]) -> list[str]:
    out: list[str] = []
    for n in names:
        if token_pat(n).search(chunk):
            out.append(n)
    return out


def group_for(path: str) -> str:
    if path == "/v1/health":
        return "health"
    if "/admin/settings/tasks" in path:
        return "admin-tasks"
    if "/admin/communication/messages" in path:
        return "admin-messages"
    if "/admin/feedbacks" in path:
        return "admin-feedbacks"
    if path.startswith("/v1/auth/"):
        return "auth"
    if path.startswith("/v1/me/"):
        return "me"
    if "/admin/email-templates" in path:
        return "admin-email-templates"
    if path.startswith("/v1/internal/"):
        return "internal"
    if "/admin/roles" in path or "/admin/permissions" in path or path == "/v1/admin/rbac/me":
        return "admin-rbac"
    if "/admin/users" in path and "/drivers" not in path:
        return "admin-users"
    if "/admin/drivers" in path:
        return "admin-drivers"
    if "/admin/trips" in path:
        return "admin-trips"
    if "/admin/finance/referrals" in path:
        return "admin-finance-referrals"
    if "/finance/coupons" in path or "/admin/finance/coupons" in path:
        return "admin-finance-coupons"
    if "/admin/finance/tariffs" in path and "subscriptions" not in path:
        return "admin-finance-tariffs"
    if "/admin/finance/paychecks" in path:
        return "admin-finance-paychecks"
    if "/admin/finance/tariff-subscriptions" in path or "/admin/finance/driver-earnings" in path:
        return "admin-finance-subscriptions"
    if "/admin/finance/checkouts" in path:
        return "admin-finance-checkouts"
    if "/admin/payments" in path:
        return "admin-payments"
    if "/v1/settings/public" in path or "/admin/settings" in path:
        return "settings"
    if "/admin/analytics" in path:
        return "admin-analytics"
    if "/admin/map" in path:
        return "admin-map"
    if "/admin/dashboard" in path:
        return "admin-dashboard"
    raise ValueError(path)


def main() -> None:
    text = HANDLER.read_text()
    lines = text.splitlines()

    schemas_body = "\n".join(lines[129:321])  # lines 130-321 (1-based): zod + helpers after "import { z }"
    schemas_body = re.sub(
        r"^const ([a-zA-Z]*Schema) =",
        r"export const \1 =",
        schemas_body,
        flags=re.M,
    )
    schemas_body = schemas_body.replace(
        "function canManageMail",
        "export function canManageMail",
    ).replace(
        "function canEditMail",
        "export function canEditMail",
    ).replace(
        "function authLike(",
        "export function authLike(",
    )
    # Keep tariff* helper schemas module-private
    for name in ("tariffFeaturesSchema", "tariffLabelStyleSchema", "tariffCardDisplaySchema"):
        schemas_body = schemas_body.replace(f"export const {name}", f"const {name}")

    validators_ts = (
        'import { z } from "zod";\n'
        'import type { AuthLike } from "../../../_shared/lib/dynamic-rbac.ts";\n'
        'import { hasPerm } from "../../../_shared/lib/dynamic-rbac.ts";\n\n'
        + schemas_body
        + "\n"
    )
    (ROOT / "src" / "schemas").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "schemas" / "validators.ts").write_text(validators_ts)

    prelude_lines = lines[0:128]
    prelude = "\n".join(prelude_lines).replace('from "../../_shared/', 'from "../../../_shared/')
    route_deps = (
        prelude
        + '\nimport { z } from "zod";\nexport { z };\nexport * from "../schemas/validators.ts";\n'
    )
    (ROOT / "src" / "api" / "route-deps.ts").write_text(route_deps + "\n")

    body = "\n".join(lines[323:1984])
    chunks = re.split(r"\n(?=  \{\n    method:)", "\n" + body)
    chunks = [c.strip() for c in chunks if c.strip()]

    G: dict[str, list[str]] = defaultdict(list)
    for c in chunks:
        m = re.search(r'path:\s*"([^"]+)"', c)
        if not m:
            raise RuntimeError("missing path")
        G[group_for(m.group(1))].append(c)

    api_dir = ROOT / "src" / "api"
    order = [
        "health",
        "admin-tasks",
        "admin-messages",
        "admin-feedbacks",
        "auth",
        "me",
        "admin-email-templates",
        "admin-users",
        "internal",
        "admin-rbac",
        "admin-drivers",
        "admin-trips",
        "admin-finance-referrals",
        "admin-finance-coupons",
        "admin-finance-tariffs",
        "admin-finance-paychecks",
        "admin-finance-subscriptions",
        "admin-finance-checkouts",
        "admin-payments",
        "settings",
        "admin-analytics",
        "admin-map",
        "admin-dashboard",
    ]

    for g in order:
        parts = G[g]
        merged = ",\n".join(parts)
        chunk_all = ",\n".join(parts)
        vals = used_names(chunk_all, VALUE_TOKENS)
        types = used_names(chunk_all, TYPE_TOKENS)
        # z always if z. appears
        if token_pat("z").search(chunk_all) and "z" not in vals:
            vals.append("z")
        vals = sorted(set(vals), key=lambda x: (x != "z", x))
        types = sorted(set(types))

        type_import = ""
        if types:
            type_import = f'import type {{ {", ".join(types)} }} from "../route-deps.ts";\n'

        # route-deps does not export types from _shared — add type-only imports from _shared
        type_import_direct = ""
        if types:
            type_lines = []
            if "PlatformPreferences" in types:
                type_lines.append(
                    'import type { PlatformPreferences } from "../../../_shared/lib/platform-settings.ts";'
                )
            if "PaymentSettingsConfig" in types:
                type_lines.append(
                    'import type { PaymentSettingsConfig } from "../../../_shared/lib/payment-settings.ts";'
                )
            if "NotificationSettingsConfig" in types:
                type_lines.append(
                    'import type { NotificationSettingsConfig } from "../../../_shared/lib/notification-settings.ts";'
                )
            if "AnalyticsAudience" in types or "AnalyticsPeriod" in types:
                type_lines.append(
                    'import type { AnalyticsAudience, AnalyticsPeriod } from "../../../_shared/lib/admin-analytics.ts";'
                )
            type_import_direct = "\n".join(type_lines) + "\n"

        val_import = ""
        if vals:
            val_import = f'import {{ {", ".join(vals)} }} from "../route-deps.ts";\n'

        route_ts = (
            'import type { RouteDef } from "../../../_shared/core/router.ts";\n'
            + type_import_direct
            + val_import
            + "\n"
            + f"export const routes: RouteDef[] = [\n{chunk_all}\n];\n"
        )
        d = api_dir / g
        d.mkdir(parents=True, exist_ok=True)
        (d / "route.ts").write_text(route_ts)

    # api/index.ts — aggregate routes
    index_lines = [
        'import type { RouteDef } from "../../../_shared/core/router.ts";',
        'import { createServiceRouter } from "../../../_shared/core/router.ts";',
    ]
    exports = []
    for g in order:
        index_lines.append(f'import {{ routes as {g.replace("-", "_")}_routes }} from "./{g}/route.ts";')
        exports.append(f"{g.replace('-', '_')}_routes")

    index_lines.append("")
    index_lines.append("const allRoutes: RouteDef[] = [")
    index_lines.append("  " + ",\n  ".join(f"...{e}" for e in exports) + ",")
    index_lines.append("];")
    index_lines.append('')
    index_lines.append('export const handle = createServiceRouter("auth-hooks", allRoutes);')
    index_lines.append("")
    (api_dir / "routes.ts").write_text("\n".join(index_lines))

    # Slim handler re-exports gateway entry (stable path for ryvo-gateway)
    slim = (
        '/**\n'
        ' * Gateway entry for auth-hooks. Route tables live under src/api/*/route.ts.\n'
        ' */\n'
        'export { handle } from "./api/routes.ts";\n'
    )
    HANDLER.write_text(slim)

    # root index for Bun: wire service router fetch if needed — keep import from handler
    print("done, groups:", {k: len(v) for k, v in G.items()})


if __name__ == "__main__":
    main()
