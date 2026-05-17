import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok, fail } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";

export const handle = createServiceRouter("gdpr-service", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "gdpr-service" }),
  },
  {
    method: "POST",
    path: "/v1/request",
    auth: true,
    handler: async (req, ctx) => {
      const { type } = await req.json();
      if (!["export", "delete"].includes(type)) {
        return fail("INVALID_TYPE", "type must be export or delete", 422);
      }
      const db = getAdminClient();
      const { data, error } = await db
        .from("gdpr_requests")
        .insert({ user_id: ctx.auth!.userId, type, status: "pending" })
        .select()
        .single();
      if (error) return fail("GDPR_REQUEST_FAILED", error.message, 500);
      return ok({ request: data });
    },
  },
  {
    method: "GET",
    path: "/v1/export/:request_id",
    auth: true,
    handler: async (_req, ctx, params) => {
      const db = getAdminClient();
      const { data: reqRow } = await db
        .from("gdpr_requests")
        .select("*")
        .eq("id", params.request_id)
        .eq("user_id", ctx.auth!.userId)
        .single();
      if (!reqRow) return fail("NOT_FOUND", "Request not found", 404);
      const userId = ctx.auth!.userId;
      const [profile, trips, payments] = await Promise.all([
        db.from("rider_profiles").select("*").eq("user_id", userId).maybeSingle(),
        db.from("trips").select("*").or(`rider_id.eq.${userId},driver_id.eq.${userId}`),
        db.from("payment_intents").select("*").eq("rider_id", userId),
      ]);
      await db
        .from("gdpr_requests")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", params.request_id);
      return ok({
        export: {
          profile: profile.data,
          trips: trips.data,
          payments: payments.data,
        },
      });
    },
  },
]);
