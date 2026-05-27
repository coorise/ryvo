import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  delete_v1_admin_finance_tariffs_id,
  get_v1_admin_finance_tariffs,
  post_v1_admin_finance_tariffs,
  put_v1_admin_finance_tariffs_id,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:read"],
    handler: get_v1_admin_finance_tariffs,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: post_v1_admin_finance_tariffs,
  },
  {
    method: "PUT",
    path: "/v1/admin/finance/tariffs/:id",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: put_v1_admin_finance_tariffs_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/tariffs/:id",
    auth: true,
    permissions: ["finances:tariffs:update"],
    handler: delete_v1_admin_finance_tariffs_id,
  },
];
