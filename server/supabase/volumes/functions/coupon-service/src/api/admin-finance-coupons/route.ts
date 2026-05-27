import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_finance_coupons,
  post_v1_admin_finance_coupons,
  patch_v1_admin_finance_coupons_id,
  delete_v1_admin_finance_coupons_id,
  post_v1_finance_coupons_validate,
  post_v1_finance_coupons_redeem,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/finance/coupons",
    auth: true,
    permissions: ["finances:referrals:read"],
    handler: get_v1_admin_finance_coupons,
  },
  {
    method: "POST",
    path: "/v1/admin/finance/coupons",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: post_v1_admin_finance_coupons,
  },
  {
    method: "PATCH",
    path: "/v1/admin/finance/coupons/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: patch_v1_admin_finance_coupons_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/finance/coupons/:id",
    auth: true,
    permissions: ["finances:referrals:update"],
    handler: delete_v1_admin_finance_coupons_id,
  },
  {
    method: "POST",
    path: "/v1/finance/coupons/validate",
    auth: true,
    handler: post_v1_finance_coupons_validate,
  },
  {
    method: "POST",
    path: "/v1/finance/coupons/redeem",
    auth: true,
    handler: post_v1_finance_coupons_redeem,
  },
];
