import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_admin_map_online_drivers, get_v1_admin_map_search } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/map/online-drivers",
    auth: true,
    permissionsAny: ["map:read", "rides:read", "drivers:read"],
    handler: get_v1_admin_map_online_drivers,
  },
  {
    method: "GET",
    path: "/v1/admin/map/search",
    auth: true,
    permissionsAny: ["map:read", "rides:read", "drivers:read"],
    rateLimit: { limit: 30, windowSec: 60, keyPrefix: "map_search" },
    handler: get_v1_admin_map_search,
  },
];
