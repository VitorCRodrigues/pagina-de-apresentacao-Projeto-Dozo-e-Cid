import type { Locale } from "@/api/types";
import { toIntlLocale } from "./locale";

// API dates are ISO 8601 UTC; they are shown in the browser's time zone (PRD section 8).
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
