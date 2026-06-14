import type { RouteDef } from "../../../../_shared/core/router.ts";
import { fail, listOnlineDrivers, ok, searchPlaces } from "../deps.ts";

export const routes: RouteDef[] = [
  {
    method: "GET",
    path: "/v1/map/nearby-drivers",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      try {
        const drivers = await listOnlineDrivers(q);
        return ok({ drivers });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Map list failed";
        return fail("MAP_NEARBY_DRIVERS_FAILED", msg, 500);
      }
    },
  },
  {
    method: "GET",
    path: "/v1/map/search",
    auth: true,
    requireVerifiedEmail: true,
    rateLimit: { limit: 30, windowSec: 60, keyPrefix: "portal_map_search" },
    handler: async (req) => {
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
    },
  },
];
