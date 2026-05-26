import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { requirePermission } from "../../../../_shared/middleware/auth.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/check",
    auth: true,
    handler: async (req) => {
      const { lat, lng, type } = await req.json();
      const db = getAdminClient();
      const { data } = await db.rpc("point_in_geofence", { lat, lng, fence_type: type ?? null });
      return ok({ geofences: data });
    },
  },
{
    method: "GET",
    path: "/v1/surge",
    auth: true,
    handler: async (req) => {
      const url = new URL(req.url);
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      const db = getAdminClient();
      const { data: fences } = await db.rpc("point_in_geofence", {
        lat,
        lng,
        fence_type: "surge_zone",
      });
      const geofenceId = fences?.[0]?.id;
      let multiplier = 1;
      if (geofenceId) {
        const { data: price } = await db
          .from("price_configs")
          .select("surge_multiplier")
          .eq("geofence_id", geofenceId)
          .limit(1)
          .maybeSingle();
        multiplier = price?.surge_multiplier ?? 1.2;
      }
      return ok({ surge_multiplier: multiplier, geofence_id: geofenceId });
    },
  },
{
    method: "GET",
    path: "/v1/admin/pricing",
    auth: true,
    handler: async (_req, ctx) => {
      const denied = requirePermission(ctx.auth!, "pricing:manage");
      if (denied) return denied;
      const db = getAdminClient();
      const { data } = await db
        .from("price_configs")
        .select("*")
        .is("geofence_id", null)
        .order("vehicle_category");
      return ok({ tariffs: data });
    },
  },
{
    method: "PUT",
    path: "/v1/admin/pricing/:vehicle_category",
    auth: true,
    handler: async (req, ctx, params) => {
      const denied = requirePermission(ctx.auth!, "pricing:manage");
      if (denied) return denied;
      const body = await req.json();
      const db = getAdminClient();
      const { data: existing } = await db
        .from("price_configs")
        .select("id")
        .eq("vehicle_category", params.vehicle_category)
        .is("geofence_id", null)
        .maybeSingle();

      const patch = {
        base_fare: body.base_fare,
        per_km: body.per_km,
        per_min: body.per_min,
        surge_multiplier: body.surge_multiplier,
        currency: body.currency,
      };

      if (existing) {
        const { data, error } = await db
          .from("price_configs")
          .update(patch)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) return fail("UPDATE_FAILED", error.message, 500);
        return ok({ tariff: data });
      }

      const { data, error } = await db
        .from("price_configs")
        .insert({ vehicle_category: params.vehicle_category, ...patch })
        .select()
        .single();
      if (error) return fail("CREATE_FAILED", error.message, 500);
      return ok({ tariff: data });
    },
  },];
