export const TARIFF_PACKAGE_TYPES = ["basic", "essential", "pro", "pro_plus", "custom"] as const;

export type TariffPackageType = (typeof TARIFF_PACKAGE_TYPES)[number];

export const TARIFF_PAYOUT_LABELS = ["instant", "days"] as const;
export type TariffPayoutLabel = (typeof TARIFF_PAYOUT_LABELS)[number];

export const BASIC_TARIFF_CODE = "basic";

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

export type TariffTextStyleMode = "auto" | "custom";

export type TariffLabelStyle = {
  text_color: string;
  background_color: string;
};

export type TariffCardTextStyles = {
  mode: TariffTextStyleMode;
  title: TariffLabelStyle | null;
  commission: TariffLabelStyle | null;
  features: TariffLabelStyle | null;
  subscription: TariffLabelStyle | null;
};

export type TariffCardDisplay = {
  background_color: string | null;
  badge: TariffCornerBadge;
  text_styles: TariffCardTextStyles;
};

export const DEFAULT_TEXT_STYLES: TariffCardTextStyles = {
  mode: "auto",
  title: null,
  commission: null,
  features: null,
  subscription: null,
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
  text_styles: { ...DEFAULT_TEXT_STYLES },
};

function parseHexColor(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : fallback;
}

function parseLabelStyle(raw: unknown, fallback: TariffLabelStyle): TariffLabelStyle | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    text_color: parseHexColor(o.text_color, fallback.text_color),
    background_color: parseHexColor(o.background_color, fallback.background_color),
  };
}

const LABEL_PARSE_FALLBACK: TariffLabelStyle = {
  text_color: "#0f172a",
  background_color: "#ffffff",
};

export function normalizeTextStyles(raw: unknown): TariffCardTextStyles {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TEXT_STYLES };
  const o = raw as Record<string, unknown>;
  const mode: TariffTextStyleMode = o.mode === "custom" ? "custom" : "auto";
  return {
    mode,
    title: parseLabelStyle(o.title, LABEL_PARSE_FALLBACK),
    commission: parseLabelStyle(o.commission, LABEL_PARSE_FALLBACK),
    features: parseLabelStyle(o.features, LABEL_PARSE_FALLBACK),
    subscription: parseLabelStyle(o.subscription, LABEL_PARSE_FALLBACK),
  };
}

export type TariffFeatures = {
  search_priority: boolean;
  search_priority_rank: number;
  promoted_listing: boolean;
  media_gallery: boolean;
  max_photos: number;
  max_videos: number;
  custom_badge: boolean;
  badge_label: string;
  priority_support: boolean;
  remove_ads: boolean;
};

export const DEFAULT_TARIFF_FEATURES: TariffFeatures = {
  search_priority: false,
  search_priority_rank: 999,
  promoted_listing: false,
  media_gallery: false,
  max_photos: 0,
  max_videos: 0,
  custom_badge: false,
  badge_label: "",
  priority_support: false,
  remove_ads: false,
};

export type TariffBillingMode = "subscription" | "one_time";

export type TariffPackage = {
  id: string;
  code: string;
  name: string;
  package_type: string;
  description: string | null;
  commission_percent: number;
  subscription_monthly: number | null;
  recurrence_count: number | null;
  recurrence_unlimited: boolean;
  valid_until: string | null;
  valid_unlimited: boolean;
  min_withdraw_amount: number;
  payout_label: TariffPayoutLabel;
  payout_delay_minutes: number;
  payout_delay_days: number;
  payout_custom_label: string | null;
  payout_cadence: string;
  quota_trips: number | null;
  discount_percent: number;
  search_boost: number;
  is_optional_subscription: boolean;
  billing_mode: TariffBillingMode;
  is_basic: boolean;
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
  const background_color = bg && /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null;
  return {
    background_color,
    text_styles: normalizeTextStyles(o.text_styles),
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
    search_priority_rank: Number(o.search_priority_rank ?? 999) || 999,
    promoted_listing: Boolean(o.promoted_listing),
    media_gallery: Boolean(o.media_gallery),
    max_photos: Number(o.max_photos) || 0,
    max_videos: Number(o.max_videos) || 0,
    custom_badge: Boolean(o.custom_badge),
    badge_label: String(o.badge_label ?? ""),
    priority_support: Boolean(o.priority_support),
    remove_ads: Boolean(o.remove_ads),
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
    recurrence_count: null,
    recurrence_unlimited: true,
    valid_until: null,
    valid_unlimited: true,
    min_withdraw_amount: 25,
    payout_label: "instant",
    payout_delay_minutes: 0,
    payout_delay_days: 0,
    payout_custom_label: "Instant",
    payout_cadence: "instant",
    quota_trips: null,
    discount_percent: 0,
    search_boost: 0,
    is_optional_subscription: false,
    billing_mode: "subscription",
    is_basic: false,
    is_system: false,
    active: true,
    features: { ...DEFAULT_TARIFF_FEATURES },
    card_display: {
      background_color: null,
      badge: { ...DEFAULT_CORNER_BADGE },
      text_styles: { ...DEFAULT_TEXT_STYLES },
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
    recurrence_count: pkg.recurrence_count,
    recurrence_unlimited: pkg.recurrence_unlimited,
    valid_until: pkg.valid_until,
    valid_unlimited: pkg.valid_unlimited,
    min_withdraw_amount: pkg.min_withdraw_amount,
    payout_label: pkg.payout_label,
    payout_delay_minutes: pkg.payout_delay_minutes,
    payout_delay_days: pkg.payout_delay_days,
    payout_custom_label: pkg.payout_custom_label,
    payout_cadence: pkg.payout_cadence,
    quota_trips: pkg.quota_trips,
    discount_percent: pkg.discount_percent ?? 0,
    search_boost: pkg.search_boost,
    is_optional_subscription: pkg.is_optional_subscription,
    billing_mode: pkg.billing_mode ?? (pkg.code === BASIC_TARIFF_CODE ? "one_time" : "subscription"),
    is_basic: pkg.is_basic,
    is_system: pkg.is_system,
    active: pkg.active,
    features: normalizeFeatures(pkg.features),
    card_display: normalizeCardDisplay(pkg.card_display),
  };
}

export function isBasicTariff(pkg: Pick<TariffPackage, "code" | "is_basic">) {
  return pkg.is_basic || pkg.code === BASIC_TARIFF_CODE;
}
