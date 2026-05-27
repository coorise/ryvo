import type { RouteDef } from "../../../../_shared/core/router.ts";
import { listPaymentsAdmin, ok } from "../deps.ts";
import { get_v1_admin_payments } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/payments",
    auth: true,
    permissions: ["payments:read"],
    handler: get_v1_admin_payments,
  },
];
