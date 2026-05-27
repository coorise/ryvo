import { getAdminClient } from "./supabase.ts";
import { getUserEmail, getUserEmails } from "./finance-referrals.ts";

export type CouponAdminRow = {
  id: string;
  code: string;
  bonus_cad: number;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
  created_at: string;
  active: boolean;
  redemption_count: number;
};

export type CouponRedemptionAdminRow = {
  id: string;
  user_id: string;
  email: string;
  code: string;
  bonus_cad: number;
  created_at: string;
};

function mapCoupon(row: Record<string, unknown>, redemptionCount = 0): CouponAdminRow {
  return {
    id: String(row.id),
    code: String(row.code),
    bonus_cad: Number(row.discount_value),
    starts_at: row.starts_at != null ? String(row.starts_at) : null,
    ends_at: row.expires_at != null ? String(row.expires_at) : null,
    updated_at: String(row.updated_at ?? row.created_at),
    created_at: String(row.created_at),
    active: Boolean(row.active ?? true),
    redemption_count: redemptionCount,
  };
}

export async function listCouponsAdmin() {
  const db = getAdminClient();
  const { data, error } = await db
    .from("coupons")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const counts = await Promise.all(
    rows.map(async (c) => {
      const { count } = await db
        .from("coupon_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", c.id);
      return count ?? 0;
    }),
  );
  return rows.map((r, i) => mapCoupon(r, counts[i]));
}

export async function createCouponAdmin(input: {
  code: string;
  bonus_cad: number;
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean;
}) {
  const db = getAdminClient();
  const code = input.code.trim().toUpperCase();
  const { data, error } = await db
    .from("coupons")
    .insert({
      code,
      discount_type: "fixed",
      discount_value: input.bonus_cad,
      starts_at: input.starts_at ?? null,
      expires_at: input.ends_at ?? null,
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapCoupon(data);
}

export async function updateCouponAdmin(
  id: string,
  input: Partial<{
    code: string;
    bonus_cad: number;
    starts_at: string | null;
    ends_at: string | null;
    active: boolean;
  }>,
) {
  const db = getAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.code != null) patch.code = input.code.trim().toUpperCase();
  if (input.bonus_cad != null) {
    patch.discount_type = "fixed";
    patch.discount_value = input.bonus_cad;
  }
  if (input.starts_at !== undefined) patch.starts_at = input.starts_at;
  if (input.ends_at !== undefined) patch.expires_at = input.ends_at;
  if (input.active !== undefined) patch.active = input.active;
  const { data, error } = await db.from("coupons").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return mapCoupon(data);
}

export async function deleteCouponAdmin(id: string) {
  const db = getAdminClient();
  const { error } = await db.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listCouponRedemptionsAdmin() {
  const db = getAdminClient();
  const { data, error } = await db
    .from("coupon_redemptions")
    .select("id, user_id, redeemed_at, coupons(code, discount_value)")
    .order("redeemed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => r.user_id));
  return rows.map((r) => {
    const c = r.coupons as { code: string; discount_value: number } | null;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      email: emails.get(r.user_id) ?? r.user_id,
      code: c?.code ?? "—",
      bonus_cad: Number(c?.discount_value ?? 0),
      created_at: String(r.redeemed_at),
    } satisfies CouponRedemptionAdminRow;
  });
}

export async function validateCouponForCheckout(code: string, userId: string, fare: number) {
  const db = getAdminClient();
  const normalized = code.trim().toUpperCase();
  const { data: coupon } = await db.from("coupons").select("*").eq("code", normalized).maybeSingle();
  if (!coupon || !coupon.active) {
    return { ok: false as const, error: "COUPON_INVALID", message: "Coupon not found" };
  }
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { ok: false as const, error: "COUPON_NOT_STARTED", message: "Coupon not active yet" };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { ok: false as const, error: "COUPON_EXPIRED", message: "Coupon expired" };
  }
  const { data: existing } = await db
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "COUPON_ALREADY_USED", message: "You already used this coupon" };
  }
  const bonus = Number(coupon.discount_value);
  const discount = Math.min(bonus, fare);
  return {
    ok: true as const,
    coupon,
    discount,
    bonus_cad: bonus,
  };
}

export async function redeemCouponAtCheckout(
  code: string,
  userId: string,
  tripId?: string | null,
) {
  const check = await validateCouponForCheckout(code, userId, Number.MAX_SAFE_INTEGER);
  if (!check.ok) throw new Error(check.message);
  const db = getAdminClient();
  const { data, error } = await db
    .from("coupon_redemptions")
    .insert({
      coupon_id: check.coupon.id,
      user_id: userId,
      trip_id: tripId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await db
    .from("coupons")
    .update({
      used_count: (check.coupon.used_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", check.coupon.id);
  return {
    redemption: data,
    bonus_cad: check.bonus_cad,
    code: check.coupon.code,
  };
}
