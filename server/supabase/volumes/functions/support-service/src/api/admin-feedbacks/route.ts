import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_admin_feedbacks_analytics } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/feedbacks/analytics",
    auth: true,
    permissionsAny: ["feedbacks:read", "support:read"],
    handler: get_v1_admin_feedbacks_analytics,
  },
];
