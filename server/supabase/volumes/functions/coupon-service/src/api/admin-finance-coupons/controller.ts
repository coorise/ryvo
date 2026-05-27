import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, couponAdminSchema, createCouponAdmin, deleteCouponAdmin, emitAudit, fail, listCouponRedemptionsAdmin, listCouponsAdmin, ok, redeemCouponAtCheckout, updateCouponAdmin, validateCouponForCheckout } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_finance_coupons: RouteHandler = async () => {
      const [coupons, redemptions] = await Promise.all([
        listCouponsAdmin(),
        listCouponRedemptionsAdmin(),
      ]);
      return ok({ coupons, redemptions });
    };

export const post_v1_admin_finance_coupons: RouteHandler = async (req, ctx) => {
      const body = couponAdminSchema.parse(await req.json());
      const row = await createCouponAdmin(body);
      await emitAudit(ctx.auth!.userId, "coupon.create", "coupons", row.id, { code: row.code });
      return ok({ coupon: row });
    };

export const patch_v1_admin_finance_coupons_id: RouteHandler = async (req, ctx, params) => {
      const body = couponAdminSchema.partial().parse(await req.json());
      const row = await updateCouponAdmin(params.id, body);
      await emitAudit(ctx.auth!.userId, "coupon.update", "coupons", params.id, {});
      return ok({ coupon: row });
    };

export const delete_v1_admin_finance_coupons_id: RouteHandler = async (_req, ctx, params) => {
      await deleteCouponAdmin(params.id);
      await emitAudit(ctx.auth!.userId, "coupon.delete", "coupons", params.id, {});
      return ok({ deleted: true });
    };

export const post_v1_finance_coupons_validate: RouteHandler = async (req, ctx) => {
      const body = z
        .object({ code: z.string().min(1), fare: z.number().min(0).optional() })
        .parse(await req.json());
      const result = await validateCouponForCheckout(
        body.code,
        ctx.auth!.userId,
        body.fare ?? 0,
      );
      if (!result.ok) return fail(result.error, result.message, 422);
      return ok({
        code: result.coupon.code,
        bonus_cad: result.bonus_cad,
        discount: result.discount,
      });
    };

export const post_v1_finance_coupons_redeem: RouteHandler = async (req, ctx) => {
      const body = z
        .object({ code: z.string().min(1), trip_id: z.string().uuid().nullable().optional() })
        .parse(await req.json());
      try {
        const result = await redeemCouponAtCheckout(body.code, ctx.auth!.userId, body.trip_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Redeem failed";
        return fail("COUPON_REDEEM_FAILED", msg, 422);
      }
    };
