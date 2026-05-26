import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  delete_v1_admin_finance_tariff_subscriptions_id,
  get_v1_admin_finance_tariff_subscriptions,
  get_v1_admin_finance_driver_earnings,
  patch_v1_admin_finance_driver_earnings_driverId,
  patch_v1_admin_finance_tariff_subscriptions_id,
  post_v1_admin_finance_driver_earnings_driverId_queue_paycheck,
  post_v1_admin_finance_tariff_subscriptions,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:read"],
    handler: get_v1_admin_finance_tariff_subscriptions,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: post_v1_admin_finance_tariff_subscriptions,
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/tariff-subscriptions/:id",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: patch_v1_admin_finance_tariff_subscriptions_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/tariff-subscriptions/:id",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: delete_v1_admin_finance_tariff_subscriptions_id,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/driver-earnings",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: get_v1_admin_finance_driver_earnings,
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/driver-earnings/:driverId",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: patch_v1_admin_finance_driver_earnings_driverId,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/driver-earnings/:driverId/queue-paycheck",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: post_v1_admin_finance_driver_earnings_driverId_queue_paycheck,
  },
];
