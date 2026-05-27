import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_communication_messages,
  get_v1_admin_communication_messages_id,
  post_v1_admin_communication_messages,
  patch_v1_admin_communication_messages_id,
  post_v1_admin_communication_messages_id_send,
  post_v1_admin_communication_messages_id_resend,
  delete_v1_admin_communication_messages_id,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/communication/messages",
    auth: true,
    permissionsAny: ["communication:messages:read", "support:reply"],
    handler: get_v1_admin_communication_messages,
  },
  {
    method: "GET",
    path: "/v1/admin/communication/messages/:id",
    auth: true,
    permissionsAny: ["communication:messages:read", "support:reply"],
    handler: get_v1_admin_communication_messages_id,
  },
  {
    method: "POST",
    path: "/v1/admin/communication/messages",
    auth: true,
    permissionsAny: ["communication:messages:create", "support:reply"],
    handler: post_v1_admin_communication_messages,
  },
  {
    method: "PATCH",
    path: "/v1/admin/communication/messages/:id",
    auth: true,
    permissionsAny: ["communication:messages:update", "support:reply"],
    handler: patch_v1_admin_communication_messages_id,
  },
  {
    method: "POST",
    path: "/v1/admin/communication/messages/:id/send",
    auth: true,
    permissionsAny: ["communication:messages:send", "support:reply"],
    handler: post_v1_admin_communication_messages_id_send,
  },
  {
    method: "POST",
    path: "/v1/admin/communication/messages/:id/resend",
    auth: true,
    permissionsAny: ["communication:messages:send", "support:reply"],
    handler: post_v1_admin_communication_messages_id_resend,
  },
  {
    method: "DELETE",
    path: "/v1/admin/communication/messages/:id",
    auth: true,
    permissionsAny: ["communication:messages:delete", "support:reply"],
    handler: delete_v1_admin_communication_messages_id,
  },
];
