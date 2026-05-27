"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import { initI18n, i18n, setAppLanguage } from "@/i18n";
import { platformSettingsService } from "@/services";

initI18n();

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const { data } = useQuery({
    queryKey: ["platform", "public"],
    queryFn: () => platformSettingsService.getPublic(),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!data?.defaultLanguage) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem("ryvo.lang") : null;
    if (!stored) {
      void setAppLanguage(data.defaultLanguage);
    }
  }, [data?.defaultLanguage]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
