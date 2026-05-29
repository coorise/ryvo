"use client";

import { MapPin } from "lucide-react";

import { LANDING_CITIES } from "@/configs/const";
import { Badge } from "@/components/ui/badge";

const FALLBACK_CITY_IMAGE =
  "https://images.unsplash.com/photo-1514905552197-0610a4d8fd73?w=600&q=80";

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
              className="group border-border relative aspect-[4/5] overflow-hidden rounded-3xl border text-left transition hover:border-primary active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.imageUrl}
                alt={city.name}
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_CITY_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute top-3 right-3">
                <Badge
                  className={
                    city.status === "live"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }
                >
                  {city.status === "live" ? "Live" : "Soon"}
                </Badge>
              </div>
              <div className="absolute right-4 bottom-4 left-4 text-white">
                <p className="text-lg font-bold">{city.name}</p>
                <p className="text-xs opacity-80">{city.province}</p>
                <p className="mt-1 flex items-center gap-1 text-xs opacity-90">
                  <MapPin className="size-3" />
                  {city.drivers.toLocaleString()} drivers
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
