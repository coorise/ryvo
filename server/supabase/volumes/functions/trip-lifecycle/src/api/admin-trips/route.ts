import type { RouteDef } from "../../../../_shared/core/router.ts";
import { getAdminClient, ok } from "../deps.ts";
import { get_v1_admin_trips } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/trips",
    auth: true,
    permissions: ["rides:read"],
    handler: get_v1_admin_trips,
  },
];
