import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_settings_notifications,
  patch_v1_admin_settings_notifications,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:read"],
    handler: get_v1_admin_settings_notifications,
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings/notifications",
    auth: true,
    permissions: ["settings:notifications:update"],
    handler: patch_v1_admin_settings_notifications,
  },
];
