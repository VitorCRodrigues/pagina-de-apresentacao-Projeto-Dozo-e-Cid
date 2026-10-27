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
