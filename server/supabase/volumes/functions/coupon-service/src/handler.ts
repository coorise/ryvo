import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import {
  validateCouponForCheckout,
  redeemCouponAtCheckout,
} from "../../_shared/lib/finance-coupons.ts";

export const handle = createServiceRouter("coupon-service", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "coupon-service" }),
  },
  {
    method: "POST",
    path: "/v1/validate",
    auth: true,
    handler: async (req, ctx) => {
      const { code, fare } = await req.json();
      const result = await validateCouponForCheckout(code, ctx.auth!.userId, fare ?? 0);
      if (!result.ok) return fail(result.error, result.message, 422);
      return ok({
        coupon: result.coupon,
        discount: result.discount,
        bonus_cad: result.bonus_cad,
      });
    },
  },
  {
    method: "POST",
    path: "/v1/redeem",
    auth: true,
    handler: async (req, ctx) => {
      const { code, trip_id } = await req.json();
      try {
        const result = await redeemCouponAtCheckout(code, ctx.auth!.userId, trip_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Redeem failed";
        return fail("COUPON_REDEEM_FAILED", msg, 422);
      }
    },
  },
]);
