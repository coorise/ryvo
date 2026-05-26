import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_drivers,
  get_v1_admin_drivers_driver_id,
  post_v1_admin_drivers,
  post_v1_admin_drivers_driver_id_documents_doc_type_review,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/drivers",
    auth: true,
    permissions: ["drivers:read"],
    handler: get_v1_admin_drivers,
  },
  {
    method: "GET",
    path: "/v1/admin/drivers/:driver_id",
    auth: true,
    permissions: ["drivers:read"],
    handler: get_v1_admin_drivers_driver_id,
  },
  {
    method: "POST",
    path: "/v1/admin/drivers",
    auth: true,
    handler: post_v1_admin_drivers,
  },
  {
    method: "POST",
    path: "/v1/admin/drivers/:driver_id/documents/:doc_type/review",
    auth: true,
    handler: post_v1_admin_drivers_driver_id_documents_doc_type_review,
  },
];
