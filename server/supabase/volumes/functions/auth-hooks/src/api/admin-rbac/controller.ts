import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, assignRoleSchema, assignRoleToUser, authLike, createRole, createRoleSchema, deleteRole, emitAudit, fail, getAdminClient, hasPerm, hasPermPrefix, listAssignableRoles, listPermissionsCatalog, listRolesWithPermissions, ok, updateRole, updateRoleSchema, withUpdatedByEmail } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const post_v1_admin_roles_assign: RouteHandler = async (req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "staff:update") && !hasPerm(actor, "roles:update")) {
        return fail("FORBIDDEN", "Missing staff:update or roles:update", 403);
      }
      const input = assignRoleSchema.parse(await req.json());
      try {
        const result = await assignRoleToUser(actor, input.user_id, input.role_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Assign failed";
        return fail("FORBIDDEN", msg, msg === "Role not found" ? 404 : 403);
      }
    };

export const post_v1_admin_roles_revoke: RouteHandler = async (req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "staff:delete") && !hasPerm(actor, "staff:update")) {
        return fail("FORBIDDEN", "Missing staff:delete", 403);
      }
      const { user_id, role_id } = z
        .object({ user_id: z.string().uuid(), role_id: z.string().uuid() })
        .parse(await req.json());
      const db = getAdminClient();
      await db.from("user_roles").delete().eq("user_id", user_id).eq("role_id", role_id);
      await emitAudit(actor.userId, "role.revoke", "user", user_id, { role_id });
      return ok({ user_id, role_id });
    };

export const get_v1_admin_permissions: RouteHandler = async (_req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "roles:read") && !hasPermPrefix(actor, "staff:")) {
        return fail("FORBIDDEN", "Missing roles:read", 403);
      }
      const catalog = await listPermissionsCatalog();
      return ok(catalog);
    };

export const get_v1_admin_roles: RouteHandler = async (_req, ctx) => {
      const actor = authLike(ctx);
      if (!hasPerm(actor, "roles:read") && !hasPermPrefix(actor, "staff:")) {
        return fail("FORBIDDEN", "Missing roles:read", 403);
      }
      const [rolesRaw, catalog, assignable_roles] = await Promise.all([
        listRolesWithPermissions(),
        listPermissionsCatalog(),
        listAssignableRoles(actor),
      ]);
      const roles = await withUpdatedByEmail(rolesRaw);
      return ok({
        roles,
        permissions: catalog.permissions,
        grouped: catalog.grouped,
        assignable_roles,
      });
    };

export const post_v1_admin_roles: RouteHandler = async (req, ctx) => {
      const body = createRoleSchema.parse(await req.json());
      try {
        const role = await createRole(authLike(ctx), body);
        return ok({ role });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const patch_v1_admin_roles_role_id: RouteHandler = async (req, ctx, params) => {
      const body = updateRoleSchema.parse(await req.json());
      try {
        const role = await updateRole(authLike(ctx), params.role_id, body);
        return ok({ role });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Update failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const delete_v1_admin_roles_role_id: RouteHandler = async (_req, ctx, params) => {
      try {
        const result = await deleteRole(authLike(ctx), params.role_id);
        return ok(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Delete failed";
        return fail("FORBIDDEN", msg, 403);
      }
    };

export const get_v1_admin_rbac_me: RouteHandler = async (_req, ctx) => {
      const actor = authLike(ctx);
      const assignable_roles = await listAssignableRoles(actor);
      return ok({
        roles: actor.roles,
        permissions: actor.permissions,
        assignable_roles,
        can_manage_staff:
          hasPermPrefix(actor, "staff:") ||
          hasPerm(actor, "roles:create") ||
          hasPerm(actor, "roles:update"),
      });
    };
