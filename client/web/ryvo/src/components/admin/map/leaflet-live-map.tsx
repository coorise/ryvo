"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { OnlineDriver, PlaceResult } from "@/services/map.service";

const carIcon = L.divIcon({
  className: "ryvo-driver-marker",
  html: `<div style="
    width:22px;height:22px;
    border-radius:9999px;
    border:2px solid hsl(142 76% 45%);
    background:hsl(142 76% 45% / 0.25);
    box-shadow:0 0 10px hsl(142 76% 45% / 0.55);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  map.flyTo([lat, lng], zoom, { duration: 0.7 });
  return null;
}

export function LeafletLiveMap({
  drivers,
  selectedDriver,
  onSelectDriver,
  placeTarget,
}: {
  drivers: OnlineDriver[];
  selectedDriver: OnlineDriver | null;
  onSelectDriver: (d: OnlineDriver) => void;
  placeTarget: PlaceResult | null;
}) {
  const center: [number, number] = [45.5088, -73.5878];

  const focusLat =
    selectedDriver?.lat != null ? selectedDriver.lat : placeTarget?.lat ?? null;
  const focusLng =
    selectedDriver?.lng != null ? selectedDriver.lng : placeTarget?.lng ?? null;

  return (
    <MapContainer
      center={center}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      className="absolute inset-0 z-0"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {drivers
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => (
          <Marker
            key={d.driver_id}
            position={[d.lat as number, d.lng as number]}
            icon={carIcon}
            eventHandlers={{ click: () => onSelectDriver(d) }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.status === "on_trip" ? "On trip" : "Available"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

      {focusLat != null && focusLng != null ? (
        <FlyTo lat={focusLat} lng={focusLng} zoom={14} />
      ) : null}
    </MapContainer>
  );
}

