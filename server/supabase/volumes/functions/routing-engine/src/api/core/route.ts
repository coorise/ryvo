import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { env } from "../../../../_shared/lib/env.ts";
import { estimateFare } from "../../../../_shared/lib/fare.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "GET",
    path: "/v1/places/autocomplete",
    auth: true,
    handler: async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q") ?? "";
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      if (!q || q.length < 2) return ok({ predictions: [] });
      if (!env.googleMapsApiKey) {
        return fail("MAPS_NOT_CONFIGURED", "GOOGLE_MAPS_API_KEY missing", 503);
      }
      let mapsUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${env.googleMapsApiKey}`;
      if (lat && lng) mapsUrl += `&location=${lat},${lng}&radius=50000`;
      const res = await fetch(mapsUrl);
      const json = await res.json();
      return ok({ predictions: json.predictions ?? [], status: json.status });
    },
  },
{
    method: "GET",
    path: "/v1/drivers/nearby",
    auth: true,
    handler: async (req) => {
      const url = new URL(req.url);
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      const radius = Number(url.searchParams.get("radius_m") ?? 5000);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return fail("VALIDATION", "lat and lng required", 422);
      }
      const db = getAdminClient();
      const { data } = await db.rpc("nearby_drivers", { lat, lng, radius_m: radius });
      return ok({
        drivers: (data ?? []).map((d: Record<string, unknown>) => ({
          driver_id: d.driver_id,
          is_online: d.is_online,
          h3_index: d.h3_index,
        })),
        count: data?.length ?? 0,
      });
    },
  },
{
    method: "POST",
    path: "/v1/estimate",
    auth: true,
    handler: async (req) => {
      const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_category } =
        await req.json();
      const fare = await estimateFare(
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng,
        vehicle_category ?? "economy",
      );
      return ok({ estimate: fare });
    },
  },
{
    method: "POST",
    path: "/v1/geocode",
    auth: true,
    handler: async (req) => {
      const { address } = await req.json();
      if (!env.googleMapsApiKey) {
        return fail("MAPS_NOT_CONFIGURED", "GOOGLE_MAPS_API_KEY missing", 503);
      }
      const mapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${env.googleMapsApiKey}`;
      const res = await fetch(mapsUrl);
      const json = await res.json();
      return ok({ results: json.results ?? [] });
    },
  },
{
    method: "POST",
    path: "/v1/directions",
    auth: true,
    handler: async (req) => {
      const { origin, destination } = await req.json();
      if (!env.googleMapsApiKey) {
        return fail("MAPS_NOT_CONFIGURED", "GOOGLE_MAPS_API_KEY missing", 503);
      }
      const mapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&departure_time=now&key=${env.googleMapsApiKey}`;
      const res = await fetch(mapsUrl);
      const json = await res.json();
      return ok({ routes: json.routes ?? [], polyline: json.routes?.[0]?.overview_polyline?.points });
    },
  },];
