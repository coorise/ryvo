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
  created_at?: string;
  updated_at?: string;
};

export type TariffPackageInput = Omit<TariffPackage, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

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
  };
}
