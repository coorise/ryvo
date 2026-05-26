"use client";

import { BaseService } from "@/lib/base-service";

export type PlaceAutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: unknown;
  types?: string[] | null;
};

export class RoutingService extends BaseService {
  constructor() {
    super("routing-engine");
  }

  autocompletePlaces(token: string | null, q: string, lat?: number, lng?: number) {
    const params = new URLSearchParams({ q });
    if (lat != null && lng != null) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }
    return this.get<{ predictions: PlaceAutocompletePrediction[]; status: string }>(
      `/v1/places/autocomplete?${params}`,
      token,
    );
  }

  getPlaceDetails(token: string | null, placeId: string) {
    const params = new URLSearchParams({ place_id: placeId });
    return this.get<{
      place: { id: string; name: string; lat: number; lng: number; source: "google" };
    }>(`/v1/places/details?${params}`, token);
  }
}

export const routingService = new RoutingService();
