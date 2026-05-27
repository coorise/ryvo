"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { STORAGE_KEYS } from "@/configs/const";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import zh from "./locales/zh.json";

const LANG_KEY = STORAGE_KEYS.language;

export function initI18n(defaultLng = "en") {
  if (i18n.isInitialized) return i18n;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        fr: { translation: fr },
        es: { translation: es },
        de: { translation: de },
        zh: { translation: zh },
      },
      lng: typeof window !== "undefined" ? localStorage.getItem(LANG_KEY) ?? defaultLng : defaultLng,
      fallbackLng: "en",
      supportedLngs: ["en", "fr", "es", "zh", "de"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: LANG_KEY,
        caches: ["localStorage"],
      },
    });

  return i18n;
}

export function setAppLanguage(lng: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANG_KEY, lng);
  }
  return i18n.changeLanguage(lng);
}

export { i18n, LANG_KEY };
