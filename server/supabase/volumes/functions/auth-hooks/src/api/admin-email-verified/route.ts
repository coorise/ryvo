import type { RouteDef } from "../../../../_shared/core/router.ts";
import { patch } from "./controller.ts";

export const routes: RouteDef[] = [
  {
    method: "PATCH",
    path: "/v1/admin/users/:user_id/email-verified",
    auth: true,
    permissions: ["users:verify_email"],
    handler: patch,
  },
];
