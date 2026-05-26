import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  delete_v1_admin_roles_role_id,
  get_v1_admin_permissions,
  get_v1_admin_rbac_me,
  get_v1_admin_roles,
  patch_v1_admin_roles_role_id,
  post_v1_admin_roles,
  post_v1_admin_roles_assign,
  post_v1_admin_roles_revoke,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/rbac/me",
    auth: true,
    handler: get_v1_admin_rbac_me,
  },
  {
    method: "GET",
    path: "/v1/admin/roles",
    auth: true,
    handler: get_v1_admin_roles,
  },
  {
    method: "POST",
    path: "/v1/admin/roles",
    auth: true,
    handler: post_v1_admin_roles,
  },
  {
    method: "PATCH",
    path: "/v1/admin/roles/:role_id",
    auth: true,
    handler: patch_v1_admin_roles_role_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/roles/:role_id",
    auth: true,
    handler: delete_v1_admin_roles_role_id,
  },
  {
    method: "GET",
    path: "/v1/admin/permissions",
    auth: true,
    handler: get_v1_admin_permissions,
  },
  {
    method: "POST",
    path: "/v1/admin/roles/assign",
    auth: true,
    handler: post_v1_admin_roles_assign,
  },
  {
    method: "POST",
    path: "/v1/admin/roles/revoke",
    auth: true,
    handler: post_v1_admin_roles_revoke,
  },
];
