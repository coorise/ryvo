import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_settings_tasks,
  post_v1_admin_settings_tasks,
  post_v1_admin_settings_tasks_id_run,
  post_v1_admin_settings_tasks_id_pause,
  post_v1_admin_settings_tasks_id_resume,
  delete_v1_admin_settings_tasks_id,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/settings/tasks",
    auth: true,
    permissionsAny: ["tasks:read", "settings:read"],
    handler: get_v1_admin_settings_tasks,
  },
  {
    method: "POST",
    path: "/v1/admin/settings/tasks",
    auth: true,
    permissionsAny: ["tasks:manage", "settings:update"],
    handler: post_v1_admin_settings_tasks,
  },
  {
    method: "POST",
    path: "/v1/admin/settings/tasks/:id/run",
    auth: true,
    permissionsAny: ["tasks:manage", "settings:update"],
    handler: post_v1_admin_settings_tasks_id_run,
  },
  {
    method: "POST",
    path: "/v1/admin/settings/tasks/:id/pause",
    auth: true,
    permissionsAny: ["tasks:manage", "settings:update"],
    handler: post_v1_admin_settings_tasks_id_pause,
  },
  {
    method: "POST",
    path: "/v1/admin/settings/tasks/:id/resume",
    auth: true,
    permissionsAny: ["tasks:manage", "settings:update"],
    handler: post_v1_admin_settings_tasks_id_resume,
  },
  {
    method: "DELETE",
    path: "/v1/admin/settings/tasks/:id",
    auth: true,
    permissionsAny: ["tasks:manage", "settings:update"],
    handler: delete_v1_admin_settings_tasks_id,
  },
];
