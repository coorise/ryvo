import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok } from "../../../../_shared/core/response.ts";
import { offerRideToNextDriver } from "../../../../_shared/lib/trip-flow.ts";
import { verifyServiceSignature } from "../../../../_shared/middleware/service-auth.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";

export async function processRideRequest(requestId: string): Promise<boolean> {
  const db = getAdminClient();
  const { data: request } = await db
    .from("trip_requests")
    .select("id,status")
    .eq("id", requestId)
    .single();
  if (!request || request.status !== "pending") return false;
  return offerRideToNextDriver(requestId);
}

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/internal/match",
    auth: false,
    handler: async (req) => {
      const raw = await req.text();
      const badSig = verifyServiceSignature(req, raw);
      if (badSig) return badSig;
      const { request_id } = JSON.parse(raw);
      const matched = await processRideRequest(request_id);
      return ok({ request_id, matched });
    },
  },];
