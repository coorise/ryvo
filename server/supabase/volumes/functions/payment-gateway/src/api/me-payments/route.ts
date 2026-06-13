import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_me_payments } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/me/payments",
    auth: true,
    requireVerifiedEmail: true,
    handler: get_v1_me_payments,
  },
];
