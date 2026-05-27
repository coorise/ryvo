import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  delete_v1_admin_finance_paychecks_id,
  get_v1_admin_finance_paychecks,
  patch_v1_admin_finance_paychecks_id,
  post_v1_admin_finance_paychecks,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: get_v1_admin_finance_paychecks,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: post_v1_admin_finance_paychecks,
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/paychecks/:id",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: patch_v1_admin_finance_paychecks_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/paychecks/:id",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: delete_v1_admin_finance_paychecks_id,
  },
];
