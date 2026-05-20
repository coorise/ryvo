import type { CSSProperties } from "react";

import type { TariffCardDisplay, TariffLabelStyle, TariffTextStyleMode } from "@/lib/tariff-types";

export type TariffLabelKind = "title" | "commission" | "features" | "subscription";

export const TARIFF_CARD_SWITCH_CLASS =
  "border-2 border-white/90 shadow-md ring-2 ring-black/25 data-checked:border-white data-checked:ring-white/40 data-unchecked:border-slate-400/80 data-unchecked:bg-white/95 dark:data-unchecked:bg-white/90";

/** Visible on custom card background colors (same idea as the switch ring). */
export const TARIFF_CARD_EDIT_BUTTON_CLASS =
  "border-2 border-slate-500/70 bg-white/95 text-slate-900 shadow-md ring-2 ring-black/20 hover:bg-white hover:text-slate-900";

export const TARIFF_CARD_DELETE_BUTTON_CLASS =
  "border-2 border-red-500/70 bg-white/95 text-red-600 shadow-md ring-2 ring-black/20 hover:bg-red-50 hover:text-red-700";

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Relative luminance 0 (dark) – 1 (light). */
export function cardLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function autoLabelStyle(cardBg: string): TariffLabelStyle {
  const light = cardLuminance(cardBg) > 0.55;
  return light
    ? { text_color: "#0f172a", background_color: "rgba(255,255,255,0.92)" }
    : { text_color: "#f8fafc", background_color: "rgba(15,23,42,0.75)" };
}

export function labelStyleToCss(style: TariffLabelStyle): CSSProperties {
  return {
    color: style.text_color,
    backgroundColor: style.background_color,
  };
}

export function resolveLabelStyle(
  display: TariffCardDisplay,
  kind: TariffLabelKind,
): { pill: boolean; style: CSSProperties; className?: string } {
  const cardBg = display.background_color;
  const custom = display.text_styles.mode === "custom";
  const override = display.text_styles[kind];

  if (!cardBg) {
    if (custom && override) {
      return { pill: true, style: labelStyleToCss(override) };
    }
    return {
      pill: kind !== "title",
      style: {},
      className:
        kind === "subscription"
          ? "text-primary"
          : kind === "title"
            ? ""
            : "text-muted-foreground",
    };
  }

  if (custom && override) {
    return { pill: true, style: labelStyleToCss(override) };
  }

  const auto = autoLabelStyle(cardBg);
  return { pill: true, style: labelStyleToCss(auto) };
}

export function pillClassName(extra?: string) {
  return `inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${extra ?? ""}`.trim();
}
