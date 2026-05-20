export const TARIFF_PACKAGE_TYPES = [
  "essential",
  "pro",
  "per_drive",
  "per_quota",
  "per_daily",
  "per_weekly",
  "per_monthly",
  "custom",
] as const;

export type TariffPackageType = (typeof TARIFF_PACKAGE_TYPES)[number];

export const TARIFF_BADGE_POSITIONS = [
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
] as const;

export type TariffBadgePosition = (typeof TARIFF_BADGE_POSITIONS)[number];
export type TariffBadgeKind = "text" | "image";

export type TariffCornerBadge = {
  enabled: boolean;
  position: TariffBadgePosition;
  kind: TariffBadgeKind;
  text: string;
  text_background_color: string;
  blink: boolean;
  image_path: string | null;
};

export type TariffCardDisplay = {
  background_color: string | null;
  badge: TariffCornerBadge;
};

export const DEFAULT_CORNER_BADGE: TariffCornerBadge = {
  enabled: true,
  position: "top_right",
  kind: "text",
  text: "NEW",
  text_background_color: "#16a34a",
  blink: true,
  image_path: null,
};

export const DEFAULT_CARD_DISPLAY: TariffCardDisplay = {
  background_color: null,
  badge: { ...DEFAULT_CORNER_BADGE },
};

export type TariffFeatures = {
  search_priority: boolean;
  promoted_listing: boolean;
  media_gallery: boolean;
  max_photos: number;
  max_videos: number;
  custom_badge: boolean;
  badge_label: string;
  priority_support: boolean;
};

export const DEFAULT_TARIFF_FEATURES: TariffFeatures = {
  search_priority: false,
  promoted_listing: false,
  media_gallery: false,
  max_photos: 0,
  max_videos: 0,
  custom_badge: false,
  badge_label: "",
  priority_support: false,
};

export type TariffPackage = {
  id: string;
  code: string;
  name: string;
  package_type: string;
  description: string | null;
  commission_percent: number;
  subscription_monthly: number | null;
  payout_cadence: string;
  payout_delay_minutes: number;
  quota_trips: number | null;
  discount_percent: number;
  search_boost: number;
  is_optional_subscription: boolean;
  is_system: boolean;
  active: boolean;
  features: TariffFeatures;
  card_display: TariffCardDisplay;
  created_at?: string;
  updated_at?: string;
};

export type TariffPackageInput = Omit<TariffPackage, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

export function normalizeCardDisplay(raw: unknown): TariffCardDisplay {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CARD_DISPLAY, badge: { ...DEFAULT_CORNER_BADGE } };
  const o = raw as Record<string, unknown>;
  const b = (o.badge && typeof o.badge === "object" ? o.badge : {}) as Record<string, unknown>;
  const pos = String(b.position ?? "top_right");
  const position = TARIFF_BADGE_POSITIONS.includes(pos as TariffBadgePosition)
    ? (pos as TariffBadgePosition)
    : "top_right";
  const kind = b.kind === "image" ? "image" : "text";
  const bg = o.background_color != null && o.background_color !== "" ? String(o.background_color) : null;
  return {
    background_color: bg && /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
    badge: {
      enabled: Boolean(b.enabled),
      position,
      kind,
      text: String(b.text ?? "NEW").slice(0, 24),
      text_background_color: /^#[0-9A-Fa-f]{6}$/.test(String(b.text_background_color ?? ""))
        ? String(b.text_background_color)
        : "#16a34a",
      blink: b.blink !== false,
      image_path: b.image_path != null && b.image_path !== "" ? String(b.image_path) : null,
    },
  };
}

export function normalizeFeatures(raw: unknown): TariffFeatures {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TARIFF_FEATURES };
  const o = raw as Record<string, unknown>;
  return {
    search_priority: Boolean(o.search_priority),
    promoted_listing: Boolean(o.promoted_listing),
    media_gallery: Boolean(o.media_gallery),
    max_photos: Number(o.max_photos) || 0,
    max_videos: Number(o.max_videos) || 0,
    custom_badge: Boolean(o.custom_badge),
    badge_label: String(o.badge_label ?? ""),
    priority_support: Boolean(o.priority_support),
  };
}

export function emptyTariffInput(): TariffPackageInput {
  return {
    code: "",
    name: "",
    package_type: "custom",
    description: "",
    commission_percent: 20,
    subscription_monthly: null,
    payout_cadence: "weekly",
    payout_delay_minutes: 0,
    quota_trips: null,
    discount_percent: 0,
    search_boost: 0,
    is_optional_subscription: false,
    is_system: false,
    active: true,
    features: { ...DEFAULT_TARIFF_FEATURES },
    card_display: {
      background_color: null,
      badge: { ...DEFAULT_CORNER_BADGE },
    },
  };
}

export function packageToInput(pkg: TariffPackage): TariffPackageInput {
  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    package_type: pkg.package_type,
    description: pkg.description ?? "",
    commission_percent: pkg.commission_percent,
    subscription_monthly: pkg.subscription_monthly,
    payout_cadence: pkg.payout_cadence,
    payout_delay_minutes: pkg.payout_delay_minutes ?? 0,
    quota_trips: pkg.quota_trips,
    discount_percent: pkg.discount_percent ?? 0,
    search_boost: pkg.search_boost,
    is_optional_subscription: pkg.is_optional_subscription,
    is_system: pkg.is_system,
    active: pkg.active,
    features: normalizeFeatures(pkg.features),
    card_display: normalizeCardDisplay(pkg.card_display),
  };
}
