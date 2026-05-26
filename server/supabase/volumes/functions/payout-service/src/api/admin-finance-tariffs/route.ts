import type { RouteDef } from "../../../../_shared/core/router.ts";
import { createTariff, deleteTariff, emitAudit, listTariffs, ok, tariffPackageSchema, upsertTariff } from "../deps.ts";
import { post_v1_admin_finance_tariffs, put_v1_admin_finance_tariffs_id, delete_v1_admin_finance_tariffs_id } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:read"],
    handler: post_v1_admin_finance_tariffs,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:read"],
    handler: put_v1_admin_finance_tariffs_id,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariffs",
    auth: true,
    permissions: ["finances:tariffs:read"],
    handler: delete_v1_admin_finance_tariffs_id,
  },
];
