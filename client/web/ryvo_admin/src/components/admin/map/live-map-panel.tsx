"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, Loader2, MapPin, Search, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { QUERY_KEYS, UI } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { platformSettingsService } from "@/services/admin.service";
import { mapService, type OnlineDriver, type PlaceResult } from "@/services/map.service";
import {
  routingService,
  type PlaceAutocompletePrediction,
} from "@/services/routing.service";
import { createSupabaseBrowserClient } from "@/services/supabase/client";

const GoogleMap = dynamic(
  async () => (await import("@/components/admin/map/google-live-map")).GoogleLiveMap,
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 flex h-full min-h-[inherit] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    ),
  },
);

const DEFAULT_MAP_CENTER = { lat: 45.5017, lng: -73.5673 };

function MapStat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className={cn("border-border bg-card flex items-center gap-3 rounded-2xl border p-3", UI.statCardRadius)}>
      <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function DriverRow({
  driver,
  selected,
  onSelect,
  onTripLabel,
  idleLabel,
}: {
  driver: OnlineDriver;
  selected: boolean;
  onSelect: () => void;
  onTripLabel: string;
  idleLabel: string;
}) {
  const onTrip = driver.status === "on_trip";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition",
        selected ? "border-primary bg-primary/10 border" : "hover:bg-muted/80 border border-transparent",
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          onTrip ? "bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{driver.name}</span>
        <span className="text-muted-foreground block truncate font-mono text-[10px]">
          {driver.driver_id.slice(0, 8).toUpperCase()} · {onTrip ? onTripLabel : idleLabel}
        </span>
      </span>
      <MapPin className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

export function LiveMapPanel() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState<OnlineDriver | null>(null);
  const [driverQuery, setDriverQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeTarget, setPlaceTarget] = useState<PlaceResult | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceAutocompletePrediction[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [debouncedPlaceQ, setDebouncedPlaceQ] = useState("");
  const placeSearchRef = useRef<HTMLDivElement>(null);

  const { data: publicSettings } = useQuery({
    queryKey: QUERY_KEYS.admin.platformPublic,
    queryFn: () => platformSettingsService.getPublic(),
    staleTime: 60_000,
  });

  const mapCenter = useMemo(() => {
    const c = publicSettings?.defaultMapCenter;
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      return { lat: c.lat, lng: c.lng };
    }
    return DEFAULT_MAP_CENTER;
  }, [publicSettings?.defaultMapCenter]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.admin.liveMapDrivers, driverQuery],
    queryFn: () => mapService.listOnlineDrivers(accessToken, driverQuery),
    enabled: Boolean(accessToken),
    refetchInterval: 8000,
  });

  const drivers = data?.drivers ?? [];

  const stats = useMemo(() => {
    const online = drivers.length;
    const onTrip = drivers.filter((d) => d.status === "on_trip").length;
    return { online, onTrip };
  }, [drivers]);

  const resolvePlace = useMutation({
    mutationFn: async (input: { placeId?: string; query?: string }) => {
      if (input.placeId) {
        const { place } = await routingService.getPlaceDetails(accessToken, input.placeId);
        return place;
      }
      const q = (input.query ?? "").trim();
      if (!q) throw new Error("Empty query");
      const res = await mapService.searchPlaces(accessToken, q);
      const hit = res.places[0];
      if (!hit) throw new Error("No results");
      return hit;
    },
    onSuccess: (place) => {
      setPlaceTarget(place);
      setPlaceQuery(place.name);
      setSuggestions([]);
      setSuggestOpen(false);
    },
  });

  const searchPlaces = useMutation({
    mutationFn: (q: string) => mapService.searchPlaces(accessToken, q),
    onSuccess: (res) => {
      const first = res.places[0];
      if (first) {
        setPlaceTarget(first);
        setPlaceQuery(first.name);
      }
      setSuggestions([]);
      setSuggestOpen(false);
    },
  });

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebouncedPlaceQ(placeQuery.trim()), 280);
    return () => window.clearTimeout(tmr);
  }, [placeQuery]);

  useEffect(() => {
    if (!accessToken || debouncedPlaceQ.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestLoading(true);
    routingService
      .autocompletePlaces(accessToken, debouncedPlaceQ, mapCenter.lat, mapCenter.lng)
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.predictions ?? []);
        setSuggestOpen((res.predictions?.length ?? 0) > 0);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setSuggestOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, debouncedPlaceQ, mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!placeSearchRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const client = createSupabaseBrowserClient();
    const channel = client
      .channel("admin-live-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_availability" },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [accessToken, refetch]);

  const pickSuggestion = useCallback(
    (item: PlaceAutocompletePrediction) => {
      setPlaceQuery(item.description);
      setSuggestOpen(false);
      resolvePlace.mutate({ placeId: item.place_id, query: item.description });
    },
    [resolvePlace],
  );

  const submitPlaceSearch = () => {
    const q = placeQuery.trim();
    if (!q) return;
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0]);
      return;
    }
    searchPlaces.mutate(q);
  };

  const mapRegionLabel =
    mapCenter.lat > 44 && mapCenter.lat < 46 && mapCenter.lng > -80 && mapCenter.lng < -70
      ? "Montréal"
      : `${mapCenter.lat.toFixed(2)}°, ${mapCenter.lng.toFixed(2)}°`;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,22rem)] lg:items-stretch lg:gap-5">
      <section className="flex min-h-0 flex-col gap-3">
        <div
          ref={placeSearchRef}
          className="border-border bg-card relative flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
            <Input
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setSuggestOpen(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitPlaceSearch();
                }
                if (e.key === "Escape") setSuggestOpen(false);
              }}
              placeholder={t("map.searchPlace")}
              className="h-11 rounded-xl pl-9"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestOpen}
              aria-autocomplete="list"
            />
            {suggestOpen && suggestLoading ? (
              <div className="border-border bg-popover absolute top-full right-0 left-0 z-[600] mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-lg">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
                <span className="text-muted-foreground text-xs">{t("common.loading")}</span>
              </div>
            ) : null}
            {suggestOpen && !suggestLoading && suggestions.length > 0 ? (
              <ul
                className="border-border bg-popover absolute top-full right-0 left-0 z-[600] mt-1 max-h-56 overflow-y-auto rounded-xl border py-1 shadow-lg"
                role="listbox"
              >
                {suggestions.map((s) => (
                  <li key={s.place_id} role="option">
                    <button
                      type="button"
                      className="hover:bg-muted/80 w-full px-3 py-2.5 text-left text-sm transition"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickSuggestion(s);
                      }}
                    >
                      <span className="line-clamp-2">{s.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {debouncedPlaceQ.length >= 2 &&
            !suggestLoading &&
            suggestions.length === 0 &&
            !resolvePlace.isPending &&
            !searchPlaces.isPending ? (
              <p className="text-muted-foreground absolute top-full left-0 z-[600] mt-1 px-1 text-xs">
                {t("map.noPlaceSuggestions")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={submitPlaceSearch}
            disabled={resolvePlace.isPending || searchPlaces.isPending || !placeQuery.trim()}
            className={cn(
              "bg-primary text-primary-foreground h-11 shrink-0 rounded-xl px-5 text-xs font-bold uppercase tracking-wide transition",
              "disabled:pointer-events-none disabled:opacity-50",
              "sm:w-auto sm:min-w-[5.5rem]",
            )}
          >
            {resolvePlace.isPending || searchPlaces.isPending ? (
              <Loader2 className="mx-auto size-4 animate-spin" />
            ) : (
              t("map.go")
            )}
          </button>
        </div>

        <div
          className={cn(
            "border-border bg-card relative min-h-[min(52dvh,28rem)] overflow-hidden border shadow-sm",
            "lg:min-h-[calc(100vh-14rem)]",
            UI.tableCardRadius,
          )}
        >
          <GoogleMap
            drivers={drivers}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
            placeTarget={placeTarget}
            mapCenter={mapCenter}
          />

          <div className="pointer-events-none absolute top-3 left-3 z-[500] flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md">
            <span className="bg-primary size-2 animate-pulse rounded-full" />
            <span className="text-foreground">LIVE</span>
            <span className="text-muted-foreground hidden sm:inline">· {mapRegionLabel}</span>
          </div>

          <div className="pointer-events-none absolute top-3 right-3 z-[500] flex gap-2 lg:hidden">
            <span className="border-border/80 bg-card/95 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md">
              {stats.online} {t("map.online")}
            </span>
            <span className="bg-primary/20 text-primary rounded-full border border-primary/30 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md">
              {stats.onTrip} {t("map.onTrip")}
            </span>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-3 lg:max-h-[calc(100vh-12rem)]">
        <div className="hidden gap-2 sm:grid sm:grid-cols-2">
          <MapStat icon={Users} value={stats.online} label={t("map.online")} />
          <MapStat icon={Activity} value={stats.onTrip} label={t("map.onTrip")} />
        </div>

        <div className="border-border bg-card rounded-2xl border p-3">
          <label className="text-muted-foreground mb-2 block text-[10px] font-semibold uppercase tracking-wider">
            {t("map.filterDrivers")}
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={driverQuery}
              onChange={(e) => setDriverQuery(e.target.value)}
              placeholder={t("map.searchDriver")}
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>

        <div className="border-border bg-card flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-2xl border lg:min-h-0">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              {t("map.drivers")}
            </h3>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">{drivers.length}</span>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {isLoading ? (
              <p className="text-muted-foreground px-2 py-8 text-center text-sm">{t("common.loading")}</p>
            ) : drivers.length === 0 ? (
              <p className="text-muted-foreground px-2 py-8 text-center text-sm">{t("map.noDriversOnline")}</p>
            ) : (
              drivers.map((d) => (
                <DriverRow
                  key={d.driver_id}
                  driver={d}
                  selected={selectedDriver?.driver_id === d.driver_id}
                  onSelect={() => setSelectedDriver(d)}
                  onTripLabel={t("map.onTrip")}
                  idleLabel={t("map.idle")}
                />
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
