"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import { STORAGE_KEYS } from "@/configs/const";
import { initI18n, i18n, setAppLanguage } from "@/i18n";
import { gatewayRetryDelay, retryGatewayUnavailable } from "@/lib/query-retry";
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
    retry: (count, error) => {
      if (retryGatewayUnavailable(count, error)) return true;
      return count < 1;
    },
    retryDelay: gatewayRetryDelay,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEYS.language);
    if (stored) {
      void setAppLanguage(stored);
      return;
    }
    if (data?.defaultLanguage) {
      void setAppLanguage(data.defaultLanguage);
    }
  }, [data?.defaultLanguage]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
