import i18n, { type BackendModule, type InitOptions } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import esTranslation from "./locales/es/translation.json";

export const supportedLocales = ["es", "pt", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "es";

// "translation" holds what every screen needs; each area loads its own texts with its route.
export const namespaces = [
  "translation",
  "onboarding",
  "account",
  "deposit",
  "portfolio",
  "plan",
  "pending",
] as const;
export type Namespace = (typeof namespaces)[number];

// Only Spanish common texts ship in the first bundle (the pilot's default). Every other
// language and area is a separate chunk, fetched when chosen or when its route opens.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>([
  "./locales/*/*.json",
  "!./locales/es/translation.json",
]);

export const lazyBackend: BackendModule = {
  type: "backend",
  init() {
    // Nothing to set up: the chunks are known at build time.
  },
  read(language, namespace, callback) {
    const load = loaders[`./locales/${language}/${namespace}.json`];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then(
      (module) => {
        callback(null, module.default);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), null);
      },
    );
  },
};

// A fresh object per instance: i18next stores loaded bundles inside `resources`.
export const initOptions = (): InitOptions => ({
  resources: { es: { translation: esTranslation } },
  // Bundled resources are partial: the backend still fetches the rest.
  partialBundledLanguages: true,
  ns: ["translation"],
  defaultNS: "translation",
  // Area screens read shared keys (errors, common, custody) from the common texts.
  fallbackNS: "translation",
  supportedLngs: supportedLocales,
  fallbackLng: defaultLocale,
  load: "languageOnly",
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  // lng can be the raw detected tag (e.g. "es-AR"); expose the locale actually in use.
  document.documentElement.lang = i18n.resolvedLanguage ?? lng;
});

// Resolves once the detected language's common texts are in: main.tsx renders after it.
export const i18nReady = i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...initOptions(),
    detection: {
      // Language choice is a UI preference, not personal data.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "od.locale",
    },
  });

export default i18n;
