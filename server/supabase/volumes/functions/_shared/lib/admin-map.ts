import { getAdminClient } from "./supabase.ts";
import { env } from "./env.ts";

export type OnlineDriverRow = {
  driver_id: string;
  is_online: boolean;
  status: "idle" | "on_trip";
  lat: number | null;
  lng: number | null;
  h3_index: string | null;
  updated_at: string;
  name: string;
};

export async function listOnlineDrivers(q?: string | null): Promise<OnlineDriverRow[]> {
  const db = getAdminClient();
  const { data, error } = await db.rpc("admin_online_drivers", { p_q: q ?? null });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    driver_id: String(r.driver_id),
    is_online: Boolean(r.is_online),
    status: r.status === "on_trip" ? "on_trip" : "idle",
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    h3_index: r.h3_index ?? null,
    updated_at: String(r.updated_at),
    name: String(r.name ?? "Driver"),
  }));
}

export async function searchPlaces(q: string): Promise<{ id: string; name: string; lat: number; lng: number }[]> {
  const query = q.trim();
  if (!query) return [];

  if (!env.googleMapsApiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY missing");
  }

  // Google Places API (New): Text Search (recommended).
  // https://developers.google.com/maps/documentation/places/web-service/text-search
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.googleMapsApiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "en",
      maxResultCount: 6,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Place search failed (${res.status}) ${body}`.trim());
  }

  const json = (await res.json().catch(() => ({}))) as any;
  const places = (json?.places ?? []) as any[];
  return places
    .map((p) => ({
      id: String(p.id ?? ""),
      name: String(p.formattedAddress ?? p.displayName?.text ?? ""),
      lat: Number(p.location?.latitude),
      lng: Number(p.location?.longitude),
    }))
    .filter((p) => p.id && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.name);
}

