import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as auth_routes } from "./auth/route.ts";
import { routes as internal_routes } from "./internal/route.ts";
import { routes as admin_rbac_routes } from "./admin-rbac/route.ts";
import { routes as admin_email_verified_routes } from "./admin-email-verified/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...auth_routes,
  ...internal_routes,
  ...admin_rbac_routes,
  ...admin_email_verified_routes,
];

export const handle = createServiceRouter("auth-hooks", allRoutes);
