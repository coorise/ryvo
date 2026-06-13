import type { RouteDef } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import {
  listMyActivityLogs,
  listMyDevices,
  listMySecurityAuthEvents,
} from "../../../../_shared/lib/portal-data.ts";
import { revokeUserDevice } from "../../../../_shared/lib/admin-security.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/me/activity",
    auth: true,
    handler: async (req, ctx) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 200);
      try {
        const logs = await listMyActivityLogs(ctx.auth!.userId, limit);
        return ok({ logs });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Activity list failed";
        return fail("ME_ACTIVITY_FAILED", msg, 500);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/me/security/auth-events",
    auth: true,
    handler: async (req, ctx) => {
      const url = new URL(req.url);
      const severity = url.searchParams.get("severity") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 300);
      try {
        const events = await listMySecurityAuthEvents(ctx.auth!.userId, { severity, limit });
        return ok({ events });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Security events failed";
        return fail("ME_SECURITY_FAILED", msg, 500);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/me/security/devices",
    auth: true,
    handler: async (req, ctx) => {
      const url = new URL(req.url);
      const includeRevoked = url.searchParams.get("include_revoked") !== "false";
      try {
        const devices = await listMyDevices(ctx.auth!.userId, includeRevoked);
        return ok({ devices });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Device list failed";
        return fail("ME_DEVICES_FAILED", msg, 500);
      }
    },
  },
  {
    method: "POST",
    path: "/v1/me/security/devices/:id/revoke",
    auth: true,
    handler: async (_req, ctx, params) => {
      try {
        const device = await revokeUserDevice(params.id, ctx.auth!.userId);
        if (device.user_id !== ctx.auth!.userId) {
          return fail("FORBIDDEN", "Not your device", 403);
        }
        return ok({ device });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Revoke failed";
        return fail("REVOKE_FAILED", msg, 400);
      }
    },
  },
];
