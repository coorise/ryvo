"use client";

import { useQuery } from "@tanstack/react-query";

import {
  TARIFF_BADGE_POSITIONS,
  type TariffCardDisplay,
  type TariffCornerBadge,
} from "@/lib/tariff-types";
import { cn } from "@/lib/utils";
import { storageService } from "@/services/storage.service";

const POSITION_CLASS: Record<TariffCornerBadge["position"], string> = {
  top_left: "top-2 left-2",
  top_right: "top-2 right-2",
  bottom_left: "bottom-2 left-2",
  bottom_right: "bottom-2 right-2",
};

type TariffCardBadgeProps = {
  display: TariffCardDisplay;
  accessToken: string | null;
  className?: string;
};

export function TariffCardBadge({ display, accessToken, className }: TariffCardBadgeProps) {
  const badge = display.badge;
  if (!badge.enabled) return null;

  if (badge.kind === "image" && badge.image_path) {
    return (
      <ImageCornerBadge
        path={badge.image_path}
        position={badge.position}
        accessToken={accessToken}
        className={className}
      />
    );
  }

  if (badge.kind !== "text" || !badge.text.trim()) return null;

  return (
    <span
      className={cn(
        "absolute z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        POSITION_CLASS[badge.position],
        badge.blink && "animate-tariff-badge-blink",
        className,
      )}
      style={{ backgroundColor: badge.text_background_color }}
    >
      {badge.text}
    </span>
  );
}

function ImageCornerBadge({
  path,
  position,
  accessToken,
  className,
}: {
  path: string;
  position: TariffCornerBadge["position"];
  accessToken: string | null;
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["storage", "signed-read", path],
    queryFn: () => storageService.getSignedReadUrl(accessToken, path),
    enabled: Boolean(accessToken && path),
    staleTime: 3000_000,
  });

  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      className={cn("absolute z-10 h-10 w-10 object-contain", POSITION_CLASS[position], className)}
    />
  );
}

export function TariffCardPreview({
  display,
  accessToken,
  children,
  className,
}: {
  display: TariffCardDisplay;
  accessToken: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const bg = display.background_color;
  return (
    <div
      className={cn(
        "border-border relative overflow-hidden rounded-2xl border p-4",
        !bg && "bg-card",
        className,
      )}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <TariffCardBadge display={display} accessToken={accessToken} />
      {children}
    </div>
  );
}

export { TARIFF_BADGE_POSITIONS };
