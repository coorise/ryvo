import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { requireRole } from "../../_shared/middleware/auth.ts";

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
    handler: async (req) => {
      const { code, fare } = await req.json();
      const db = getAdminClient();
      const { data: coupon } = await db
        .from("coupons")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (!coupon) return fail("COUPON_INVALID", "Coupon not found", 404);
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return fail("COUPON_EXPIRED", "Coupon expired", 422);
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return fail("COUPON_EXHAUSTED", "Coupon fully redeemed", 422);
      }
      const discount =
        coupon.discount_type === "percent"
          ? (fare * coupon.discount_value) / 100
          : coupon.discount_value;
      return ok({ coupon, discount: Math.min(discount, fare) });
    },
  },
  {
    method: "POST",
    path: "/v1/admin",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "admin", "super_admin");
      if (denied) return denied;
      const body = await req.json();
      const db = getAdminClient();
      const { data, error } = await db.from("coupons").insert(body).select().single();
      if (error) return fail("COUPON_CREATE_FAILED", error.message, 500);
      return ok({ coupon: data });
    },
  },
]);
