"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";

import { LANDING_CITIES } from "@/configs/const";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FALLBACK_CITY_IMAGE =
  "https://images.unsplash.com/photo-1514905552197-0610a4d8fd73?w=800&q=80";

export function LandingCityGrid() {
  const totalDrivers = LANDING_CITIES.reduce((sum, c) => sum + c.drivers, 0);

  return (
    <section id="cities" className="bg-muted/30 border-border border-t py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Canadian presence</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">
          {LANDING_CITIES.length} cities · {totalDrivers.toLocaleString()}+ drivers
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {LANDING_CITIES.map((city) => (
            <article
              key={city.name}
              className="group border-border relative min-h-[220px] overflow-hidden rounded-3xl border transition hover:border-primary active:scale-[0.98] sm:min-h-[260px]"
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={city.imageUrl}
                  alt={`${city.name}, ${city.province}`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.src.includes(FALLBACK_CITY_IMAGE)) {
                      img.src = FALLBACK_CITY_IMAGE;
                    }
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"
                  aria-hidden
                />
                <div className="absolute top-3 right-3 z-10">
                  <Badge
                    className={cn(
                      city.status === "live"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {city.status === "live" ? "Live" : "Soon"}
                  </Badge>
                </div>
                <div className="absolute right-4 bottom-4 left-4 z-10 text-white">
                  <p className="text-lg font-bold drop-shadow-sm">{city.name}</p>
                  <p className="text-xs opacity-90">{city.province}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs opacity-90">
                    <MapPin className="size-3 shrink-0" />
                    {city.drivers.toLocaleString()} drivers
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
