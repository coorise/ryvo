import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, getFeedbackAnalytics, ok, parseFeedbackCategory, parseFeedbackGranularity } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_feedbacks_analytics: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const category = parseFeedbackCategory(url.searchParams.get("category"));
      if (!category) {
        return fail("INVALID_CATEGORY", "category must be product, driver, or staff", 400);
      }
      const granularity = parseFeedbackGranularity(url.searchParams.get("granularity"));
      try {
        const analytics = await getFeedbackAnalytics(category, granularity);
        return ok(analytics);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Feedback analytics failed";
        return fail("FEEDBACK_ANALYTICS_FAILED", msg, 500);
      }
    };
