import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_feedbacks_routes } from "./admin-feedbacks/route.ts";
import { routes as admin_tickets_routes } from "./admin-tickets/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_feedbacks_routes,
  ...admin_tickets_routes,
];

export const handle = createServiceRouter("support-service", allRoutes);
