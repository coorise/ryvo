import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_analytics_routes } from "./admin-analytics/route.ts";
import { routes as admin_dashboard_routes } from "./admin-dashboard/route.ts";
import { routes as me_routes } from "./me/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_analytics_routes,
  ...admin_dashboard_routes,
  ...me_routes,
];

export const handle = createServiceRouter("audit-service", allRoutes);
