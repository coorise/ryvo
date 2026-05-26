import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, deleteCheckoutSession, emitAudit, listCheckouts, ok, scheduleCheckoutRecovery, seedDemoFinanceIfEmpty } from "../deps.ts";
import { get_v1_admin_finance_checkouts, delete_v1_admin_finance_checkouts_id, post_v1_admin_finance_checkouts_id_recovery_reminder } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/checkouts",
    auth: true,
    permissions: ["finances:checkouts:read"],
    handler: get_v1_admin_finance_checkouts,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/checkouts",
    auth: true,
    permissions: ["finances:checkouts:read"],
    handler: delete_v1_admin_finance_checkouts_id,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/checkouts",
    auth: true,
    permissions: ["finances:checkouts:read"],
    handler: post_v1_admin_finance_checkouts_id_recovery_reminder,
  },
];
