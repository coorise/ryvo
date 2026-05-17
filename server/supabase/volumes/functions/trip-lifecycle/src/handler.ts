import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { publishEvent, TOPICS } from "../../_shared/lib/kafka.ts";
import { requireRole } from "../../_shared/middleware/auth.ts";
import { estimateFare } from "../../_shared/lib/fare.ts";
import {
  acceptAssignment,
  rejectAssignment,
  offerRideToNextDriver,
} from "../../_shared/lib/trip-flow.ts";
import { broadcastTrip } from "../../_shared/lib/realtime.ts";
import { z } from "zod";

const requestSchema = z.object({
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  dropoff_lat: z.number(),
  dropoff_lng: z.number(),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().optional(),
  vehicle_category: z.enum(["economy", "comfort", "xl"]),
  idempotency_key: z.string().uuid(),
});

export const handle = createServiceRouter("trip-lifecycle", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "trip-lifecycle" }),
  },
  {
    method: "POST",
    path: "/v1/estimate",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req) => {
      const body = requestSchema.omit({ idempotency_key: true }).extend({
        idempotency_key: z.string().uuid().optional(),
      }).parse(await req.json());
      const fare = await estimateFare(
        body.pickup_lat,
        body.pickup_lng,
        body.dropoff_lat,
        body.dropoff_lng,
        body.vehicle_category,
      );
      return ok({ estimate: fare });
    },
  },
  {
    method: "GET",
    path: "/v1/request/:request_id/status",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (_req, ctx, params) => {
      const db = getAdminClient();
      const { data: request } = await db
        .from("trip_requests")
        .select("*, trip_assignments(*)")
        .eq("id", params.request_id)
        .single();
      if (!request) return fail("NOT_FOUND", "Request not found", 404);
      if (request.rider_id !== ctx.auth!.userId && !ctx.auth!.roles.includes("driver")) {
        return fail("FORBIDDEN", "Not your request", 403);
      }
      return ok({ request });
    },
  },
  {
    method: "GET",
    path: "/v1/trip/active",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (_req, ctx) => {
      const db = getAdminClient();
      const col = ctx.auth!.roles.includes("driver") ? "driver_id" : "rider_id";

      if (ctx.auth!.roles.includes("driver")) {
        const { data: assignment, error: assignErr } = await db
          .from("trip_assignments")
          .select("*")
          .eq("driver_id", ctx.auth!.userId)
          .in("status", ["offered", "accepted"])
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (assignErr) return fail("ACTIVE_LOOKUP_FAILED", assignErr.message, 500);
        if (assignment) {
          const { data: request } = await db
            .from("trip_requests")
            .select("*")
            .eq("id", assignment.request_id)
            .single();
          return ok({
            trip: null,
            assignment,
            request,
            phase: assignment.status === "offered" ? "driver_offer" : "awaiting_payment",
          });
        }
      }

      const { data: trip } = await db
        .from("trips")
        .select("*, trip_requests(*)")
        .eq(col, ctx.auth!.userId)
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (trip) return ok({ trip, phase: "active_trip" });

      if (ctx.auth!.roles.includes("driver")) {
        return ok({ trip: null, request: null, phase: "idle" });
      }

      const { data: request } = await db
        .from("trip_requests")
        .select("*, trip_assignments(*)")
        .eq("rider_id", ctx.auth!.userId)
        .in("status", ["pending", "offering", "accepted", "awaiting_payment"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return ok({ trip: null, request, phase: request ? "pre_trip" : "idle" });
    },
  },
  {
    method: "POST",
    path: "/v1/trip/request",
    auth: true,
    requireVerifiedEmail: true,
    rateLimit: { limit: 3, windowSec: 60, keyPrefix: "trip-request" },
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "client");
      if (denied) return denied;
      const body = requestSchema.parse(await req.json());
      const db = getAdminClient();
      const { data: existing } = await db
        .from("trip_requests")
        .select("*")
        .eq("idempotency_key", body.idempotency_key)
        .maybeSingle();
      if (existing) return ok({ request: existing, idempotent: true });

      const fare = await estimateFare(
        body.pickup_lat,
        body.pickup_lng,
        body.dropoff_lat,
        body.dropoff_lng,
        body.vehicle_category,
      );

      const pickup = `SRID=4326;POINT(${body.pickup_lng} ${body.pickup_lat})`;
      const dropoff = `SRID=4326;POINT(${body.dropoff_lng} ${body.dropoff_lat})`;
      const { data: request, error } = await db
        .from("trip_requests")
        .insert({
          rider_id: ctx.auth!.userId,
          pickup_geom: pickup,
          dropoff_geom: dropoff,
          pickup_address: body.pickup_address,
          dropoff_address: body.dropoff_address,
          vehicle_category: body.vehicle_category,
          estimated_fare: fare.total,
          fare_breakdown: fare,
          idempotency_key: body.idempotency_key,
          status: "pending",
        })
        .select()
        .single();
      if (error) return fail("REQUEST_FAILED", error.message, 500);
      await publishEvent(TOPICS.RIDE_REQUEST_CREATED, { request, estimate: fare }, request.id);
      const offered = await offerRideToNextDriver(request.id);
      if (offered) {
        const { data: refreshed } = await db
          .from("trip_requests")
          .select("*, trip_assignments(*)")
          .eq("id", request.id)
          .single();
        return ok({
          request: refreshed ?? request,
          estimate: fare,
          matching: "offered",
          message: "Awaiting driver acceptance before payment",
        });
      }
      return ok({
        request,
        estimate: fare,
        matching: "no_drivers",
        message: "Awaiting driver acceptance before payment",
      });
    },
  },
  {
    method: "POST",
    path: "/v1/assignment/:assignment_id/accept",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const result = await acceptAssignment(params.assignment_id, ctx.auth!.userId);
      if ("error" in result) return fail(result.code, result.error, 400);
      const db = getAdminClient();
      await db
        .from("trip_requests")
        .update({ status: "awaiting_payment" })
        .eq("id", result.request_id);
      const { data: request } = await db
        .from("trip_requests")
        .select("*")
        .eq("id", result.request_id)
        .single();
      return ok({ request, proceed_to_payment: true });
    },
  },
  {
    method: "POST",
    path: "/v1/assignment/:assignment_id/reject",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (_req, ctx, params) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      await rejectAssignment(params.assignment_id, ctx.auth!.userId);
      return ok({ rejected: true, finding_next_driver: true });
    },
  },
  {
    method: "POST",
    path: "/v1/request/:request_id/cancel",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (_req, ctx, params) => {
      const db = getAdminClient();
      const { data: request } = await db
        .from("trip_requests")
        .select("*")
        .eq("id", params.request_id)
        .single();
      if (!request) return fail("NOT_FOUND", "Request not found", 404);
      if (request.rider_id !== ctx.auth!.userId) {
        return fail("FORBIDDEN", "Not your request", 403);
      }
      if (["paid", "cancelled", "expired"].includes(request.status)) {
        return fail("INVALID_STATE", "Cannot cancel in current state", 422);
      }
      await db.from("trip_requests").update({ status: "cancelled" }).eq("id", params.request_id);
      await db
        .from("trip_assignments")
        .update({ status: "rejected", rejected_at: new Date().toISOString() })
        .eq("request_id", params.request_id)
        .eq("status", "offered");
      return ok({ cancelled: true });
    },
  },
  {
    method: "POST",
    path: "/v1/trip/:trip_id/transition",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req, ctx, params) => {
      const { status } = await req.json();
      const db = getAdminClient();
      const { data: trip, error } = await db
        .from("trips")
        .update({
          status,
          ...(status === "completed" ? { ended_at: new Date().toISOString() } : {}),
          ...(status === "in_progress" ? { started_at: new Date().toISOString() } : {}),
        })
        .eq("id", params.trip_id)
        .select()
        .single();
      if (error) return fail("TRIP_NOT_FOUND", error.message, 404);
      await publishEvent(
        status === "completed" ? TOPICS.RIDE_TRIP_COMPLETED : TOPICS.RIDE_TRIP_STATE_CHANGED,
        { trip, status },
        trip.id,
      );
      await broadcastTrip(trip.id, "trip.state_changed", { trip, status });
      return ok({ trip });
    },
  },
  {
    method: "POST",
    path: "/v1/trip/:trip_id/rate",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req, ctx, params) => {
      const { stars, comment, role } = await req.json();
      const db = getAdminClient();
      const { data: trip } = await db.from("trips").select("*").eq("id", params.trip_id).single();
      if (!trip || trip.status !== "completed") {
        return fail("INVALID_STATE", "Trip must be completed to rate", 422);
      }
      const revieweeId = role === "driver" ? trip.driver_id : trip.rider_id;
      if (role === "driver" && ctx.auth!.userId !== trip.rider_id) {
        return fail("FORBIDDEN", "Only rider rates driver", 403);
      }
      if (role === "rider" && ctx.auth!.userId !== trip.driver_id) {
        return fail("FORBIDDEN", "Only driver rates rider", 403);
      }
      const { data: review } = await db
        .from("ratings_reviews")
        .insert({
          trip_id: params.trip_id,
          reviewer_id: ctx.auth!.userId,
          reviewee_id: revieweeId,
          role,
          stars,
          comment,
        })
        .select()
        .single();
      const table = role === "driver" ? "driver_profiles" : "rider_profiles";
      const pk = role === "driver" ? "user_id" : "user_id";
      const { data: reviews } = await db
        .from("ratings_reviews")
        .select("stars")
        .eq("reviewee_id", revieweeId);
      const avg =
        (reviews ?? []).reduce((s, r) => s + r.stars, 0) / Math.max(1, (reviews ?? []).length);
      await db.from(table).update({ rating_avg: avg }).eq(pk, revieweeId);
      return ok({ review });
    },
  },
]);
