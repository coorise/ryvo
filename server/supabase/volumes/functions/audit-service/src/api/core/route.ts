import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { requirePermission } from "../../../../_shared/middleware/auth.ts";
import {
  listActivityLogs,
  listSecurityAuthEvents,
  listUserDevices,
  revokeUserDevice,
} from "../../../../_shared/lib/admin-security.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/logs",
    auth: true,
    permissions: ["audit:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 200);
      const logs = await listActivityLogs(limit);
      return ok({ logs });
    },
  },
{
    method: "GET",
    path: "/v1/security/auth-events",
    auth: true,
    permissions: ["audit:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const severity = url.searchParams.get("severity") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 300);
      const events = await listSecurityAuthEvents({ severity, limit });
      return ok({ events });
    },
  },
{
    method: "GET",
    path: "/v1/security/devices",
    auth: true,
    permissions: ["audit:read"],
    handler: async (req) => {
      const url = new URL(req.url);
      const includeRevoked = url.searchParams.get("include_revoked") !== "false";
      const devices = await listUserDevices(includeRevoked);
      return ok({ devices });
    },
  },
{
    method: "POST",
    path: "/v1/security/devices/:id/revoke",
    auth: true,
    permissions: ["audit:update"],
    handler: async (_req, ctx, params) => {
      const device = await revokeUserDevice(params.id, ctx.auth!.userId);
      return ok({ device });
    },
  },];
