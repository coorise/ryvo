import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { verifyServiceSignature } from "../../../../_shared/middleware/service-auth.ts";
import { processExpiredOffers } from "../../../../_shared/lib/trip-flow.ts";
import { runDueAdminTasks } from "../../../../_shared/lib/admin-tasks.ts";

export async function cleanupStaleDrivers(): Promise<number> {
  const db = getAdminClient();
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await db
    .from("driver_availability")
    .update({ is_online: false })
    .lt("updated_at", cutoff)
    .eq("is_online", true)
    .select("driver_id");
  return data?.length ?? 0;
}

export async function expireIdempotencyKeys(): Promise<number> {
  const db = getAdminClient();
  const { data } = await db
    .from("idempotency_requests")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return data?.length ?? 0;
}

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/run/stale-drivers",
    auth: false,
    handler: async (req) => {
      const raw = await req.text();
      const badSig = verifyServiceSignature(req, raw);
      if (badSig) return badSig;
      const count = await cleanupStaleDrivers();
      return ok({ cleaned: count });
    },
  },
{
    method: "POST",
    path: "/v1/run/expire-idempotency",
    auth: false,
    handler: async (req) => {
      const raw = await req.text();
      const badSig = verifyServiceSignature(req, raw);
      if (badSig) return badSig;
      const count = await expireIdempotencyKeys();
      return ok({ expired: count });
    },
  },
{
    method: "POST",
    path: "/v1/run/expire-offers",
    auth: false,
    handler: async (req) => {
      const raw = await req.text();
      const badSig = verifyServiceSignature(req, raw);
      if (badSig) return badSig;
      const result = await processExpiredOffers();
      return ok(result);
    },
  },
{
    method: "POST",
    path: "/v1/run/admin-tasks",
    auth: false,
    handler: async (req) => {
      const raw = await req.text();
      const badSig = verifyServiceSignature(req, raw);
      if (badSig) return badSig;
      const result = await runDueAdminTasks();
      return ok(result);
    },
  },];
