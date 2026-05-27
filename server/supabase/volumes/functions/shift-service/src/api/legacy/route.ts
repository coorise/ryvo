import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { requireRole } from "../../../../_shared/middleware/auth.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/clock-in",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const db = getAdminClient();
      const { data, error } = await db
        .from("shifts")
        .insert({ driver_id: ctx.auth!.userId, clocked_in_at: new Date().toISOString() })
        .select()
        .single();
      if (error) return fail("SHIFT_FAILED", error.message, 500);
      return ok({ shift: data });
    },
  },
{
    method: "POST",
    path: "/v1/clock-out",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const { shift_id, total_km, trip_count } = await req.json();
      const db = getAdminClient();
      const { data } = await db
        .from("shifts")
        .update({
          clocked_out_at: new Date().toISOString(),
          total_km,
          trip_count,
        })
        .eq("id", shift_id)
        .eq("driver_id", ctx.auth!.userId)
        .select()
        .single();
      return ok({ shift: data });
    },
  },];
