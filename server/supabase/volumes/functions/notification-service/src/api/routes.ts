import type { RouteDef } from "../../../_shared/core/router.ts";
import { createServiceRouter } from "../../../_shared/core/router.ts";
import { routes as health_routes } from "./health/route.ts";
import { routes as core_routes } from "./core/route.ts";
import { routes as admin_messages_routes } from "./admin-messages/route.ts";
import { routes as admin_email_templates_routes } from "./admin-email-templates/route.ts";
import { routes as settings_notifications_routes } from "./settings-notifications/route.ts";

const allRoutes: RouteDef[] = [
  ...health_routes,
  ...core_routes,
  ...admin_messages_routes,
  ...admin_email_templates_routes,
  ...settings_notifications_routes,
];

export const handle = createServiceRouter("notification-service", allRoutes);
