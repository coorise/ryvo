import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_users,
  post_v1_admin_users,
  get_v1_admin_users_user_id,
  patch_v1_admin_users_user_id,
  delete_v1_admin_users_user_id,
  post_v1_admin_users_ban,
  post_v1_admin_users_unban,
} from "./controller.ts";

export const routes: RouteDef[] = [
  { method: "GET", path: "/v1/admin/users", auth: true, handler: get_v1_admin_users },
  { method: "POST", path: "/v1/admin/users", auth: true, handler: post_v1_admin_users },
  {
    method: "GET",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: get_v1_admin_users_user_id,
  },
  {
    method: "PATCH",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: patch_v1_admin_users_user_id,
  },
  {
    method: "DELETE",
    path: "/v1/admin/users/:user_id",
    auth: true,
    handler: delete_v1_admin_users_user_id,
  },
  {
    method: "POST",
    path: "/v1/admin/users/ban",
    auth: true,
    permissions: ["users:ban"],
    handler: post_v1_admin_users_ban,
  },
  {
    method: "POST",
    path: "/v1/admin/users/unban",
    auth: true,
    permissions: ["users:ban"],
    handler: post_v1_admin_users_unban,
  },
];
