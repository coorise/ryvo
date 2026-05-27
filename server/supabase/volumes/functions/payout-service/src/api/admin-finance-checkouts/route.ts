import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  delete_v1_admin_finance_checkouts_id,
  get_v1_admin_finance_checkouts,
  post_v1_admin_finance_checkouts_id_recovery_reminder,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/checkouts",
    auth: true,
    permissions: ["finances:checkouts:read"],
    handler: get_v1_admin_finance_checkouts,
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/checkouts/:id",
    auth: true,
    permissions: ["finances:checkouts:update"],
    handler: delete_v1_admin_finance_checkouts_id,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/checkouts/:id/recovery-reminder",
    auth: true,
    permissions: ["finances:checkouts:update"],
    handler: post_v1_admin_finance_checkouts_id_recovery_reminder,
  },
];
