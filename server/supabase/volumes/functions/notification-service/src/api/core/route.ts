import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok } from "../../../../_shared/core/response.ts";
import { queueNotification } from "../../../../_shared/lib/events.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/send",
    auth: true,
    handler: async (req, ctx) => {
      const { channel, type, payload, user_id } = await req.json();
      const target = user_id ?? ctx.auth!.userId;
      await queueNotification(target, channel, type, payload ?? {});
      return ok({ queued: true, user_id: target });
    },
  },
{
    method: "GET",
    path: "/v1/inbox",
    auth: true,
    handler: async (_req, ctx) => {
      const db = getAdminClient();
      const { data } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", ctx.auth!.userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return ok({ notifications: data });
    },
  },
{
    method: "PATCH",
    path: "/v1/inbox/:id/read",
    auth: true,
    handler: async (_req, ctx, params) => {
      const db = getAdminClient();
      await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("user_id", ctx.auth!.userId);
      return ok({ id: params.id, read: true });
    },
  },];
