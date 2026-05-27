import type { RouteDef } from "../../../../_shared/core/router.ts";
import { getAdminDashboard, ok, requireRole } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_dashboard: RouteHandler = async (_req, ctx) => {
      const denied = requireRole(
        ctx.auth!,
        "super_admin",
        "admin",
        "staff",
        "moderator",
        "agent",
        "support",
      );
      if (denied) return denied;
      const dashboard = await getAdminDashboard();
      return ok(dashboard);
    };
