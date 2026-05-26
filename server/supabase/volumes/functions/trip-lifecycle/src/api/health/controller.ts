import type { RouteHandler } from "../../../../_shared/core/router.ts";
import { ok } from "../../../../_shared/core/response.ts";
import { healthPayload } from "./service.ts";

export const get: RouteHandler = async () => ok(healthPayload());
