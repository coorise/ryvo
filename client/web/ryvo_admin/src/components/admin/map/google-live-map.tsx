"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useMemo, useRef } from "react";

import { env } from "@/configs/env";
import type { OnlineDriver, PlaceResult } from "@/services/map.service";

type LatLngLiteral = google.maps.LatLngLiteral;

const FALLBACK_CENTER: LatLngLiteral = { lat: 45.5017, lng: -73.5673 };

function toLatLng(lat: number | null | undefined, lng: number | null | undefined): LatLngLiteral | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function GoogleLiveMap({
  drivers,
  selectedDriver,
  onSelectDriver,
  placeTarget,
  mapCenter,
}: {
  drivers: OnlineDriver[];
  selectedDriver: OnlineDriver | null;
  onSelectDriver: (d: OnlineDriver) => void;
  placeTarget: PlaceResult | null;
  mapCenter: LatLngLiteral;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.driver_id, d])), [drivers]);
  const initialCenter = useMemo(
    () => ({
      lat: Number.isFinite(mapCenter.lat) ? mapCenter.lat : FALLBACK_CENTER.lat,
      lng: Number.isFinite(mapCenter.lng) ? mapCenter.lng : FALLBACK_CENTER.lng,
    }),
    [mapCenter.lat, mapCenter.lng],
  );

  useEffect(() => {
    if (!env.googleMapsApiKey) return;
    if (!elRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;
    setOptions({ key: env.googleMapsApiKey, v: "weekly" });

    (async () => {
      try {
        await importLibrary("maps");
        await importLibrary("marker");
        if (cancelled) return;
        mapRef.current = new google.maps.Map(elRef.current!, {
          center: initialCenter,
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          backgroundColor: "transparent",
        });
      } catch {
        // fallback message in parent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter(initialCenter);
  }, [initialCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const nextIds = new Set<string>();

    for (const d of drivers) {
      const pos = toLatLng(d.lat, d.lng);
      if (!pos) continue;
      nextIds.add(d.driver_id);

      let marker = existing.get(d.driver_id);
      if (!marker) {
        const dot = document.createElement("div");
        dot.style.width = "14px";
        dot.style.height = "14px";
        dot.style.borderRadius = "9999px";
        dot.style.border = "2px solid rgba(34,197,94,1)";
        dot.style.background = "rgba(34,197,94,0.25)";
        dot.style.boxShadow = "0 0 12px rgba(34,197,94,0.55)";
        dot.style.transform = "translateZ(0)";
        dot.style.cursor = "pointer";

        marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: pos,
          content: dot,
          title: d.name,
        });
        marker.addListener("click", () => {
          const driver = driverById.get(d.driver_id);
          if (driver) onSelectDriver(driver);
        });
        existing.set(d.driver_id, marker);
      } else {
        marker.position = pos;
      }
    }

    for (const [id, marker] of existing.entries()) {
      if (nextIds.has(id)) continue;
      marker.map = null;
      existing.delete(id);
    }
  }, [drivers, driverById, onSelectDriver]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const driverPos = selectedDriver ? toLatLng(selectedDriver.lat, selectedDriver.lng) : null;
    const placePos = placeTarget ? toLatLng(placeTarget.lat, placeTarget.lng) : null;
    const target = driverPos ?? placePos;
    if (!target) return;

    map.panTo(target);
    map.setZoom(14);
  }, [placeTarget, selectedDriver]);

  if (!env.googleMapsApiKey) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center px-6 text-center text-sm">
        Google Maps is not configured. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
      </div>
    );
  }

  return <div ref={elRef} className="absolute inset-0 z-0" />;
}
