import type { Locale } from "@/api/types";

// Regional tags for Intl. es-AR and pt-BR give "US$ 1.234,56"; en-US gives "$1,234.56" (PRD section 9).
const intlLocales: Record<Locale, string> = {
  es: "es-AR",
  pt: "pt-BR",
  en: "en-US",
};

export function toIntlLocale(locale: Locale): string {
  return intlLocales[locale];
}

// i18next language (possibly undefined or a regional tag such as "pt-BR") to a supported
// Locale; ES by default.
export function asLocale(language: string | undefined): Locale {
  const primary = language?.split("-")[0];
  return primary === "pt" || primary === "en" ? primary : "es";
}
