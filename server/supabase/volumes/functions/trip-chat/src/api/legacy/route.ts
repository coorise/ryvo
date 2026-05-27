import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { broadcastTrip } from "../../../../_shared/lib/realtime.ts";

async function assertTripChatAllowed(tripId: string, userId: string): Promise<Response | null> {
  const db = getAdminClient();
  const { data: trip } = await db.from("trips").select("*").eq("id", tripId).single();
  if (!trip) return fail("NOT_FOUND", "Trip not found", 404);
  if (trip.rider_id !== userId && trip.driver_id !== userId) {
    return fail("FORBIDDEN", "Not a participant", 403);
  }
  if (["completed", "cancelled"].includes(trip.status)) {
    return fail("CHAT_CLOSED", "Trip has ended", 403);
  }
  return null;
}

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/trip/:trip_id/messages",
    auth: true,
    handler: async (req, ctx, params) => {
      const blocked = await assertTripChatAllowed(params.trip_id, ctx.auth!.userId);
      if (blocked) return blocked;
      const db = getAdminClient();
      const { data } = await db
        .from("trip_messages")
        .select("*")
        .eq("trip_id", params.trip_id)
        .order("created_at", { ascending: true })
        .limit(200);
      return ok({ messages: data });
    },
  },
{
    method: "POST",
    path: "/v1/trip/:trip_id/messages",
    auth: true,
    handler: async (req, ctx, params) => {
      const blocked = await assertTripChatAllowed(params.trip_id, ctx.auth!.userId);
      if (blocked) return blocked;
      const { body, attachments } = await req.json();
      if (!body?.trim()) return fail("VALIDATION", "Message body required", 422);
      const db = getAdminClient();
      const { data: message, error } = await db
        .from("trip_messages")
        .insert({
          trip_id: params.trip_id,
          sender_id: ctx.auth!.userId,
          body: body.trim(),
          attachments: attachments ?? [],
        })
        .select()
        .single();
      if (error) return fail("SEND_FAILED", error.message, 500);
      await broadcastTrip(params.trip_id, "chat.message", { message });
      return ok({ message });
    },
  },];
