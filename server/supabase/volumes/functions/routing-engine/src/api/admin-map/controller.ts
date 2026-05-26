import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, listOnlineDrivers, ok, searchPlaces } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_map_online_drivers: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      try {
        const drivers = await listOnlineDrivers(q);
        return ok({ drivers });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Map list failed";
        return fail("MAP_ONLINE_DRIVERS_FAILED", msg, 500);
      }
    };

export const get_v1_admin_map_search: RouteHandler = async (req) => {
      const url = new URL(req.url);
      const q = (url.searchParams.get("q") ?? "").trim();
      if (!q) return ok({ places: [] });
      try {
        const places = await searchPlaces(q);
        return ok({ places: places.map((p) => ({ ...p, source: "google" })) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Search failed";
        return fail("MAP_SEARCH_FAILED", msg, 500);
      }
    };
