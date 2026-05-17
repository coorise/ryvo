import { createServiceRouter } from "../../_shared/core/router.ts";
import { ok } from "../../_shared/core/response.ts";
import { getAdminClient } from "../../_shared/lib/supabase.ts";
import { requirePermission } from "../../_shared/middleware/auth.ts";

export const handle = createServiceRouter("audit-service", [
  {
    method: "GET",
    path: "/v1/health",
    handler: async () => ok({ status: "ok", service: "audit-service" }),
  },
  {
    method: "GET",
    path: "/v1/logs",
    auth: true,
    handler: async (req, ctx) => {
      const denied = requirePermission(ctx.auth!, "audit:read");
      if (denied) return denied;
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const db = getAdminClient();
      const { data } = await db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return ok({ logs: data });
    },
  },
]);
