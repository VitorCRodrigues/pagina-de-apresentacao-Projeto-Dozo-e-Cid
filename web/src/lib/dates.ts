import type { Locale } from "@/api/types";
import { toIntlLocale } from "./locale";

// API dates are ISO 8601 UTC; they are shown in the browser's time zone (PRD section 8).
// Argentina and Brazil read times on a 24-hour clock.
function hourCycle(locale: Locale) {
  return locale === "en" ? "h12" : "h23";
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: hourCycle(locale),
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeStyle: "short",
    hourCycle: hourCycle(locale),
  }).format(new Date(iso));
}
