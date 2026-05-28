"use client";

import type { ReactNode } from "react";

import {
  pillClassName,
  resolveLabelStyle,
  type TariffLabelKind,
} from "@/lib/tariff-card-styles";
import type { TariffCardDisplay } from "@/lib/tariff-types";
import { cn } from "@/lib/utils";

type TariffCardLabelProps = {
  display: TariffCardDisplay;
  kind: TariffLabelKind;
  children: ReactNode;
  className?: string;
};

export function TariffCardLabel({ display, kind, children, className }: TariffCardLabelProps) {
  const resolved = resolveLabelStyle(display, kind);
  if (resolved.pill) {
    return (
      <span className={cn(pillClassName(className), "mt-1")} style={resolved.style}>
        {children}
      </span>
    );
  }
  return (
    <p className={cn(resolved.className, "text-xs", className)} style={resolved.style}>
      {children}
    </p>
  );
}

export function TariffCardTitle({
  display,
  children,
  className,
}: {
  display: TariffCardDisplay;
  children: ReactNode;
  className?: string;
}) {
  const resolved = resolveLabelStyle(display, "title");
  if (resolved.pill && display.background_color) {
    return (
      <span className={cn(pillClassName("text-sm font-bold"), className)} style={resolved.style}>
        {children}
      </span>
    );
  }
  return <p className={cn("truncate font-bold", className)}>{children}</p>;
}
