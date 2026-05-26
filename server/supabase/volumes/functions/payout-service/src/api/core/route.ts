import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { requirePermission } from "../../../../_shared/middleware/auth.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/driver/:driver_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      if (ctx.auth!.userId !== params.driver_id && !ctx.auth!.permissions.includes("payouts:read")) {
        return fail("FORBIDDEN", "Cannot view payouts", 403);
      }
      const db = getAdminClient();
      const { data } = await db
        .from("payouts")
        .select("*")
        .eq("driver_id", params.driver_id)
        .order("period_end", { ascending: false });
      return ok({ payouts: data });
    },
  },
{
    method: "POST",
    path: "/v1/batch",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requirePermission(ctx.auth!, "payouts:write");
      if (denied) return denied;
      const { period_start, period_end, commission_rate } = await req.json();
      const db = getAdminClient();
      const { data: trips } = await db
        .from("trips")
        .select("driver_id, id")
        .eq("status", "completed")
        .gte("ended_at", period_start)
        .lte("ended_at", period_end);
      const byDriver = new Map<string, number>();
      for (const t of trips ?? []) {
        byDriver.set(t.driver_id, (byDriver.get(t.driver_id) ?? 0) + 1);
      }
      const payouts = [];
      for (const [driver_id, trip_count] of byDriver) {
        const gross = trip_count * 25;
        const commission = gross * (commission_rate ?? 0.2);
        const { data } = await db
          .from("payouts")
          .insert({
            driver_id,
            period_start,
            period_end,
            gross_fare: gross,
            commission_rate: commission_rate ?? 0.2,
            commission_amount: commission,
            net_amount: gross - commission,
            status: "pending",
            trip_count,
          })
          .select()
          .single();
        if (data) payouts.push(data);
      }
      return ok({ payouts });
    },
  },];
