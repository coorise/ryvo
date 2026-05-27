import { DATE_FORMAT, DATE_LOCALE_MAP, UI } from "@/configs/const";
import { i18n } from "@/i18n";

function resolveLocale(): string {
  const lang = (i18n.language ?? "en").split("-")[0];
  return DATE_LOCALE_MAP[lang] ?? DATE_FORMAT.locale;
}

export function formatTimestamp(value: string | number | null | undefined): string {
  if (value == null || value === "") return UI.emptyPlaceholder;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return UI.emptyPlaceholder;
  return date.toLocaleString(resolveLocale(), DATE_FORMAT.options);
}

export function formatDateOnly(value: string | number | null | undefined): string {
  if (value == null || value === "") return UI.emptyPlaceholder;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return UI.emptyPlaceholder;
  return date.toLocaleDateString(resolveLocale(), DATE_FORMAT.dateOnly);
}

/** Compact “15 Jan · 14:32” style for tables */
export function formatLastSeen(value: string | number | null | undefined): string {
  if (value == null || value === "") return UI.emptyPlaceholder;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return UI.emptyPlaceholder;
  const loc = resolveLocale();
  const day = date.toLocaleDateString(loc, { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}
