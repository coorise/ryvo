import { env } from "./env.ts";
import { getAdminClient } from "./supabase.ts";

export type FareEstimate = {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_amount: number;
  total: number;
  currency: string;
  distance_km: number;
  duration_min: number;
  surge_multiplier: number;
};

export async function estimateFare(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  vehicleCategory: string,
): Promise<FareEstimate> {
  const db = getAdminClient();
  let distanceKm = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  let durationMin = Math.max(5, Math.round((distanceKm / 30) * 60));

  if (env.googleMapsApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${dropoffLat},${dropoffLng}&key=${env.googleMapsApiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      const el = json.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") {
        distanceKm = (el.distance?.value ?? 0) / 1000;
        durationMin = Math.max(1, Math.round((el.duration?.value ?? 0) / 60));
      }
    } catch {
      /* fallback haversine */
    }
  }

  const { data: price } = await db
    .from("price_configs")
    .select("*")
    .eq("vehicle_category", vehicleCategory)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base = Number(price?.base_fare ?? 3.5);
  const perKm = Number(price?.per_km ?? 1.2);
  const perMin = Number(price?.per_min ?? 0.35);
  let surgeMult = Number(price?.surge_multiplier ?? 1);

  const { data: fences } = await db.rpc("point_in_geofence", {
    lat: pickupLat,
    lng: pickupLng,
    fence_type: "surge_zone",
  });
  if (fences?.[0]) {
    const { data: surgePrice } = await db
      .from("price_configs")
      .select("surge_multiplier")
      .eq("geofence_id", fences[0].id)
      .limit(1)
      .maybeSingle();
    if (surgePrice?.surge_multiplier) surgeMult = Number(surgePrice.surge_multiplier);
  }

  const distanceFare = distanceKm * perKm;
  const timeFare = durationMin * perMin;
  const subtotal = base + distanceFare + timeFare;
  const surgeAmount = subtotal * (surgeMult - 1);
  const total = Math.round((subtotal + surgeAmount) * 100) / 100;

  return {
    base_fare: base,
    distance_fare: Math.round(distanceFare * 100) / 100,
    time_fare: Math.round(timeFare * 100) / 100,
    surge_amount: Math.round(surgeAmount * 100) / 100,
    total,
    currency: price?.currency ?? "USD",
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_min: durationMin,
    surge_multiplier: surgeMult,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
