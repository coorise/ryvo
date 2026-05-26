import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, authLike, createClientUser, createUserSchema, deleteAdminUser, emitAudit, fail, getAdminClient, getAdminUserDetail, hasPerm, listAdminUsers, ok, requireRole, updateClientUser } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_users: RouteHandler = async (req, ctx) => {
      const url = new URL(req.url);
      const kind = (url.searchParams.get("kind") ?? "clients") as "clients" | "drivers" | "staff" | "all";
      const actor = authLike(ctx);
      if (kind === "clients" && !hasPerm(actor, "users:read")) {
        return fail("FORBIDDEN", "Missing users:read", 403);
      }
      if (kind === "drivers" && !hasPerm(actor, "drivers:read")) {
        return fail("FORBIDDEN", "Missing drivers:read", 403);
      }
      if (kind === "staff" && !hasPerm(actor, "staff:read") && !hasPerm(actor, "roles:read")) {
        return fail("FORBIDDEN", "Missing staff:read", 403);
      }
      const users = await listAdminUsers({ kind, limit: 150 });
      return ok({ users });
    };

export const post_v1_admin_users: RouteHandler = async (req, ctx) => {
      const body = createUserSchema.parse(await req.json());
      try {
        const user = await createClientUser(authLike(ctx), body);
        return ok({ user });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const get_v1_admin_users_user_id: RouteHandler = async (_req, ctx, params) => {
      const actor = authLike(ctx);
      const user = await getAdminUserDetail(params.user_id);
      if (!user) return fail("NOT_FOUND", "User not found", 404);
      const canRead =
        hasPerm(actor, "users:read") ||
        hasPerm(actor, "staff:read") ||
        hasPerm(actor, "drivers:read");
      if (!canRead) return fail("FORBIDDEN", "Missing permission", 403);
      return ok({ user });
    };

export const patch_v1_admin_users_user_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          full_name: z.string().max(120).optional(),
          email: z.string().email().optional(),
        })
        .parse(await req.json());
      try {
        const user = await updateClientUser(authLike(ctx), params.user_id, body);
        return ok({ user });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const delete_v1_admin_users_user_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({ mode: z.enum(["soft", "permanent"]).default("soft") })
        .parse(await req.json().catch(() => ({ mode: "soft" })));
      try {
        const result = await deleteAdminUser(authLike(ctx), params.user_id, body.mode);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        const code = msg === "NOT_FOUND" ? 404 : 403;
        return fail(code === 404 ? "NOT_FOUND" : "FORBIDDEN", msg, code);
      }
    };

export const post_v1_admin_users_ban: RouteHandler = async (req, ctx) => {
      const { user_id, reason } = await req.json();
      const db = getAdminClient();
      await db
        .from("user_profiles")
        .update({ banned_at: new Date().toISOString() })
        .eq("user_id", user_id);
      await emitAudit(ctx.auth!.userId, "user.ban", "user", user_id, { reason });
      return ok({ user_id, banned: true });
    };

export const post_v1_admin_users_unban: RouteHandler = async (req, ctx) => {
      const { user_id } = await req.json();
      const db = getAdminClient();
      await db.from("user_profiles").update({ banned_at: null }).eq("user_id", user_id);
      await emitAudit(ctx.auth!.userId, "user.unban", "user", user_id, {});
      return ok({ user_id, banned: false });
    };
