import type { RouteDef } from "../../../../_shared/core/router.ts";
import { getAdminClient, ok } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_trips: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const db = getAdminClient();
      const { data } = await db
        .from("trip_requests")
        .select("id,status,created_at,pickup_address,dropoff_address,client_id,driver_id,fare_estimate")
        .order("created_at", { ascending: false })
        .limit(limit);
      return ok({ trips: data ?? [] });
    };
