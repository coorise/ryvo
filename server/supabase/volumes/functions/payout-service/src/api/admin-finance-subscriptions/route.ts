import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, adjustDriverEarning, cancelTariffSubscription, createTariffSubscription, deleteTariffSubscription, emitAudit, getAdminClient, holdTariffSubscription, listDriverEarnings, listTariffSubscriptions, migrateTariffSubscription, ok, queuePaycheckFromEarnings, resumeTariffSubscription } from "../deps.ts";
import { get_v1_admin_finance_tariff_subscriptions, post_v1_admin_finance_tariff_subscriptions, patch_v1_admin_finance_tariff_subscriptions_id, patch_v1_admin_finance_driver_earnings_driverId, post_v1_admin_finance_driver_earnings_driverId_queue_paycheck, delete_v1_admin_finance_tariff_subscriptions_id } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:read"],
    handler: get_v1_admin_finance_tariff_subscriptions,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:read"],
    handler: post_v1_admin_finance_tariff_subscriptions,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:read"],
    handler: patch_v1_admin_finance_tariff_subscriptions_id,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/tariff-subscriptions",
    auth: true,
    permissions: ["finances:subscriptions:update"],
    handler: patch_v1_admin_finance_driver_earnings_driverId,
  },
  {
    method: "GET",
    path: "/v1/admin/finance/driver-earnings",
    auth: true,
    permissions: ["finances:paychecks:read"],
    handler: post_v1_admin_finance_driver_earnings_driverId_queue_paycheck,
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/driver-earnings/:driverId",
    auth: true,
    permissions: ["finances:paychecks:update"],
    handler: delete_v1_admin_finance_tariff_subscriptions_id,
  },
];
