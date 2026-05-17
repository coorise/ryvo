import type { Router } from "../../_shared/lib/bun/types";
import { healthRoute } from "./health";

export const router: Router = {
  "/v1/health": healthRoute,
};
