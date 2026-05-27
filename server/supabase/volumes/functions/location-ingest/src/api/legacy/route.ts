import { latLngToCell } from "h3-js";
import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";
import { publishEvent, TOPICS } from "../../../../_shared/lib/kafka.ts";
import { requireRole } from "../../../../_shared/middleware/auth.ts";
import { assertDriverCanGoOnline } from "../../../../_shared/lib/trip-flow.ts";
import { broadcastTrip } from "../../../../_shared/lib/realtime.ts";
import { z } from "zod";

const pingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().optional(),
  speed_kmh: z.number().optional(),
  heading: z.number().optional(),
  trip_id: z.string().uuid().optional(),
});

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/ingest",
    auth: true,
    requireVerifiedEmail: true,
    rateLimit: { limit: 30, windowSec: 60, keyPrefix: "location" },
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const body = pingSchema.parse(await req.json());
      if ((body.speed_kmh ?? 0) > 200) {
        return fail("IMPLAUSIBLE_SPEED", "Speed exceeds plausibility threshold", 422);
      }
      const h3Index = latLngToCell(body.lat, body.lng, 8);
      const db = getAdminClient();
      const point = `SRID=4326;POINT(${body.lng} ${body.lat})`;
      await db.from("driver_availability").upsert({
        driver_id: ctx.auth!.userId,
        is_online: true,
        h3_index: h3Index,
        geom: point,
        updated_at: new Date().toISOString(),
      });
      if (body.trip_id) {
        const { data: trip } = await db
          .from("trips")
          .select("id,rider_id,driver_id,status")
          .eq("id", body.trip_id)
          .single();
        if (trip && trip.driver_id === ctx.auth!.userId) {
          await db.from("driver_location_samples").insert({
            driver_id: ctx.auth!.userId,
            geom: point,
            accuracy_m: body.accuracy_m,
            speed_kmh: body.speed_kmh,
            heading: body.heading,
            trip_id: body.trip_id,
          });
          await broadcastTrip(body.trip_id, "driver.location", {
            driver_id: ctx.auth!.userId,
            lat: body.lat,
            lng: body.lng,
            heading: body.heading,
            speed_kmh: body.speed_kmh,
            sampled_at: new Date().toISOString(),
          });
        }
      }
      await publishEvent(
        TOPICS.LOCATION_DRIVER_UPDATED,
{ driver_id: ctx.auth!.userId, ...body, h3_index: h3Index },
        ctx.auth!.userId,
      );
      return ok({ driver_id: ctx.auth!.userId, h3_index: h3Index });
    },
  },
{
    method: "POST",
    path: "/v1/online",
    auth: true,
    requireVerifiedEmail: true,
    handler: async (req, ctx) => {
      const denied = requireRole(ctx.auth!, "driver");
      if (denied) return denied;
      const { is_online, lat, lng } = await req.json();
      if (is_online) {
        const kycErr = await assertDriverCanGoOnline(ctx.auth!.userId);
        if (kycErr) return fail("KYC_REQUIRED", kycErr, 403);
      }
      const db = getAdminClient();
      const row: Record<string, unknown> = {
        driver_id: ctx.auth!.userId,
        is_online: Boolean(is_online),
        updated_at: new Date().toISOString(),
      };
      if (lat != null && lng != null) {
        row.geom = `SRID=4326;POINT(${lng} ${lat})`;
        row.h3_index = latLngToCell(lat, lng, 8);
      }
      await db.from("driver_availability").upsert(row);
      return ok({ driver_id: ctx.auth!.userId, is_online: row.is_online });
    },
  },];
