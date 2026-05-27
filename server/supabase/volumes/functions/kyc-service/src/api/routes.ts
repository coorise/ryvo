import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_drivers_routes } from "./admin-drivers/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_drivers_routes,
];

export const handle = createServiceRouter("kyc-service", allRoutes);
