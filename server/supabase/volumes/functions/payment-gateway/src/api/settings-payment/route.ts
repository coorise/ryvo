import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_admin_settings_payment, patch_v1_admin_settings_payment } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:read"],
    handler: get_v1_admin_settings_payment,
  },
  {
    method: "PATCH",
    path: "/v1/admin/settings/payment",
    auth: true,
    permissions: ["settings:payment:update"],
    handler: patch_v1_admin_settings_payment,
  },
];
