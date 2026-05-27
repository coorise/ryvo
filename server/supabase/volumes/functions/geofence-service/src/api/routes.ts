import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as legacy_routes } from "./legacy/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...legacy_routes,
];

export const handle = createServiceRouter("geofence-service", allRoutes);
