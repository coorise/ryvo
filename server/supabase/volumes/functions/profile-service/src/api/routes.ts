import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as me_routes } from "./me/route.ts";
import { routes as admin_users_routes } from "./admin-users/route.ts";
import { routes as settings_platform_routes } from "./settings-platform/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...me_routes,
  ...admin_users_routes,
  ...settings_platform_routes,
];

export const handle = createServiceRouter("profile-service", allRoutes);
