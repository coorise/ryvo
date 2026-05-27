import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_admin_dashboard } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/dashboard",
    auth: true,
    handler: get_v1_admin_dashboard,
  },
];
