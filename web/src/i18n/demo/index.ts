import type { i18n as I18n } from "i18next";
import en from "./en.json";
import es from "./es.json";
import pt from "./pt.json";

// Sample copy for stories. Kept out of the app bundle: only Storybook imports this file.
export const demoResources = { es, pt, en } as const;

export function loadDemoResources(i18n: I18n): void {
  for (const [locale, bundle] of Object.entries(demoResources)) {
    i18n.addResourceBundle(locale, "demo", bundle, true, true);
  }
}
