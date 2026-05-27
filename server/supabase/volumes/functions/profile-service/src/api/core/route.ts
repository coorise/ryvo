import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { requireRole } from "../../../../_shared/middleware/auth.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/me",
    auth: true,
    handler: async (_req, ctx) => {
      const db = getAdminClient();
      const { data: user } = await db.auth.admin.getUserById(ctx.auth!.userId);
      // /me allowed before email verified (shows status in app)
      const { data: rider } = await db
        .from("rider_profiles")
        .select("*")
        .eq("user_id", ctx.auth!.userId)
        .maybeSingle();
      const { data: driver } = await db
        .from("driver_profiles")
        .select("*")
        .eq("user_id", ctx.auth!.userId)
        .maybeSingle();
      return ok({
        user: {
          id: user.user?.id,
          email: user.user?.email,
          phone: user.user?.phone,
          metadata: user.user?.user_metadata,
        },
        rider_profile: rider,
        driver_profile: driver,
        roles: ctx.auth!.roles,
        permissions: ctx.auth!.permissions,
      });
    },
  },
{
    method: "GET",
    path: "/v1/driver/:user_id/public",
    auth: true,
    handler: async (_req, _ctx, params) => {
      const db = getAdminClient();
      const { data: profile } = await db
        .from("driver_profiles")
        .select("user_id,avatar_url,rating_avg,trip_count,kyc_status")
        .eq("user_id", params.user_id)
        .single();
      const { data: reviews } = await db
        .from("ratings_reviews")
        .select("stars,comment,created_at,reviewer_id")
        .eq("reviewee_id", params.user_id)
        .eq("role", "driver")
        .order("created_at", { ascending: false })
        .limit(20);
      return ok({ profile, reviews });
    },
  },
{
    method: "GET",
    path: "/v1/trip/:trip_id/counterparty",
    auth: true,
    handler: async (_req, ctx, params) => {
      const db = getAdminClient();
      const { data: trip } = await db.from("trips").select("*").eq("id", params.trip_id).single();
      if (!trip) return fail("NOT_FOUND", "Trip not found", 404);
      const isDriver = trip.driver_id === ctx.auth!.userId;
      const isRider = trip.rider_id === ctx.auth!.userId;
      if (!isDriver && !isRider) return fail("FORBIDDEN", "Not your trip", 403);

      const counterpartyId = isDriver ? trip.rider_id : trip.driver_id;
      const { data: authUser } = await db.auth.admin.getUserById(counterpartyId);

      if (isDriver) {
        const { data: rider } = await db
          .from("rider_profiles")
          .select("user_id,avatar_url,rating_avg,trip_count")
          .eq("user_id", counterpartyId)
          .maybeSingle();
        return ok({
          role: "rider",
          user_id: counterpartyId,
          name: authUser.user?.user_metadata?.full_name ?? authUser.user?.email,
          phone: authUser.user?.phone,
          avatar_url: rider?.avatar_url,
          rating_avg: rider?.rating_avg,
        });
      }

      const { data: driver } = await db
        .from("driver_profiles")
        .select("user_id,avatar_url,rating_avg,trip_count,kyc_status")
        .eq("user_id", counterpartyId)
        .single();
      return ok({
        role: "driver",
        user_id: counterpartyId,
        name: authUser.user?.user_metadata?.full_name ?? authUser.user?.email,
        avatar_url: driver?.avatar_url,
        rating_avg: driver?.rating_avg,
        trip_count: driver?.trip_count,
      });
    },
  },];
