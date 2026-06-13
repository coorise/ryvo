import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_payments_routes } from "./admin-payments/route.ts";
import { routes as me_payments_routes } from "./me-payments/route.ts";
import { routes as settings_payment_routes } from "./settings-payment/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_payments_routes,
  ...me_payments_routes,
  ...settings_payment_routes,
];

export const handle = createServiceRouter("payment-gateway", allRoutes);
