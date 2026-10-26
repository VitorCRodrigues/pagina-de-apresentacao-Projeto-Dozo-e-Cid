import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";
import pt from "./pt.json";

export const supportedLocales = ["es", "pt", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "es";

export const resources = {
  es: { translation: es },
  pt: { translation: pt },
  en: { translation: en },
} as const;

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: supportedLocales,
    fallbackLng: defaultLocale,
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      // Language choice is a UI preference, not personal data.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "od.locale",
    },
  });

export default i18n;
