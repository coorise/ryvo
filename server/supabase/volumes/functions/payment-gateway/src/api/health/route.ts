import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/health",
    handler: get,
  },
];
