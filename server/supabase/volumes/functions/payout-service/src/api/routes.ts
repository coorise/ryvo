import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_finance_referrals_routes } from "./admin-finance-referrals/route.ts";
import { routes as admin_finance_tariffs_routes } from "./admin-finance-tariffs/route.ts";
import { routes as admin_finance_paychecks_routes } from "./admin-finance-paychecks/route.ts";
import { routes as admin_finance_subscriptions_routes } from "./admin-finance-subscriptions/route.ts";
import { routes as admin_finance_checkouts_routes } from "./admin-finance-checkouts/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_finance_referrals_routes,
  ...admin_finance_tariffs_routes,
  ...admin_finance_paychecks_routes,
  ...admin_finance_subscriptions_routes,
  ...admin_finance_checkouts_routes,
];

export const handle = createServiceRouter("payout-service", allRoutes);
