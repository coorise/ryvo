import type { RouteDef } from "../../../../_shared/core/router.ts";
import { get_v1_me_profile, patch_v1_me_profile } from "./controller.ts";

export const routes: RouteDef[] = [
  { method: "GET", path: "/v1/me/profile", auth: true, handler: get_v1_me_profile },
  { method: "PATCH", path: "/v1/me/profile", auth: true, handler: patch_v1_me_profile },
];
