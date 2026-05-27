import type { RouteDef } from "../../../../_shared/core/router.ts";
import {
  get_v1_admin_email_templates,
  put_v1_admin_email_templates_template_key,
} from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/admin/email-templates",
    auth: true,
    handler: get_v1_admin_email_templates,
  },
  {
    method: "PUT",
    path: "/v1/admin/email-templates/:template_key",
    auth: true,
    handler: put_v1_admin_email_templates_template_key,
  },
];
