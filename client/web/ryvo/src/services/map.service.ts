"use client";

import { BaseService } from "@/lib/base-service";

export type OnlineDriver = {
  driver_id: string;
  is_online: boolean;
  status: "idle" | "on_trip";
  lat: number | null;
  lng: number | null;
  h3_index: string | null;
  updated_at: string;
  name: string;
};

export type PlaceResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: "google";
};

export class MapService extends BaseService {
  constructor() {
    super("routing-engine");
  }

  listOnlineDrivers(token: string | null, query?: string) {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    return this.get<{ drivers: OnlineDriver[] }>(`/v1/admin/map/online-drivers${qs}`, token);
  }

  listNearbyDrivers(token: string | null, query?: string) {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    return this.get<{ drivers: OnlineDriver[] }>(`/v1/map/nearby-drivers${qs}`, token);
  }

  searchPlaces(token: string | null, q: string) {
    const qs = `?q=${encodeURIComponent(q)}`;
    return this.get<{ places: PlaceResult[] }>(`/v1/admin/map/search${qs}`, token);
  }

  searchPlacesPortal(token: string | null, q: string) {
    const qs = `?q=${encodeURIComponent(q)}`;
    return this.get<{ places: PlaceResult[] }>(`/v1/map/search${qs}`, token);
  }
}

export const mapService = new MapService();
