import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, cancelPaycheck, createPaycheck, deletePaycheck, emitAudit, fail, holdPaycheck, listPaychecks, ok, resumePaycheck, seedDemoFinanceIfEmpty, updatePaycheckAmount, updatePaycheckStatus } from "../deps.ts";
import { get_v1_admin_finance_paychecks, post_v1_admin_finance_paychecks, patch_v1_admin_finance_paychecks_id, delete_v1_admin_finance_paychecks_id } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: get_v1_admin_finance_paychecks,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: post_v1_admin_finance_paychecks,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: patch_v1_admin_finance_paychecks_id,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/paychecks",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: delete_v1_admin_finance_paychecks_id,
  },
];
