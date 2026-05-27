"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/configs/const";
import { setAppLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

const LABELS: Record<AppLanguage, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
  zh: "中文",
  de: "DE",
};

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LanguageSwitcher({ className, compact }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as AppLanguage;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {!compact && <Languages className="text-muted-foreground size-4" aria-hidden />}
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => void setAppLanguage(e.target.value)}
        className={cn(
          "border-border bg-background hover:border-primary rounded-full border px-2 py-1 text-xs font-semibold outline-none",
          compact && "py-0.5",
        )}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {LABELS[lng]}
          </option>
        ))}
      </select>
    </div>
  );
}
