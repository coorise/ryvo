import type { RouteDef } from "../../../../_shared/core/router.ts";
import type { AnalyticsAudience, AnalyticsPeriod } from "../../../../_shared/lib/admin-analytics.ts";
import { fail, getAdminAnalytics, ok } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_analytics: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const period = (url.searchParams.get("period") ?? "30d") as AnalyticsPeriod;
      const audience = (url.searchParams.get("audience") ?? "all") as AnalyticsAudience;
      const allowedPeriods: AnalyticsPeriod[] = ["7d", "30d", "90d", "1y"];
      const allowedAudience: AnalyticsAudience[] = ["all", "clients", "drivers"];
      const p = allowedPeriods.includes(period) ? period : "30d";
      const a = allowedAudience.includes(audience) ? audience : "all";
      try {
        const analytics = await getAdminAnalytics(p, a);
        return ok(analytics);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Analytics failed";
        return fail("ANALYTICS_FAILED", msg, 500);
      }
    };
