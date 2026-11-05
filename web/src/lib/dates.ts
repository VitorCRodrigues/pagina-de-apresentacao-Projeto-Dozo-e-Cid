import type { Locale } from "@/api/types";
import { toIntlLocale } from "./locale";

// API dates are ISO 8601 UTC; they are shown in the browser's time zone (PRD section 8).
// Argentina and Brazil read times on a 24-hour clock.
// `timeZone` overrides the browser's zone; tests use it to stay independent of the machine.

interface DateOptions {
  timeZone?: string;
}

function hourCycle(locale: Locale) {
  return locale === "en" ? "h12" : "h23";
}

export function formatDate(iso: string, locale: Locale, { timeZone }: DateOptions = {}): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    ...(timeZone && { timeZone }),
  }).format(new Date(iso));
}

export function formatDateTime(
  iso: string,
  locale: Locale,
  { timeZone }: DateOptions = {},
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: hourCycle(locale),
    ...(timeZone && { timeZone }),
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale, { timeZone }: DateOptions = {}): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeStyle: "short",
    hourCycle: hourCycle(locale),
    ...(timeZone && { timeZone }),
  }).format(new Date(iso));
}

// Terms versions come from the API as a month ("2026-11"): shown as that month in the client's
// language ("noviembre de 2026"), never raw. Any other label is shown as it comes.
export function formatVersion(version: string, locale: Locale): string {
  const month = /^(\d{4})-(\d{2})$/.exec(version);
  if (!month) return version;
  const date = new Date(Date.UTC(Number(month[1]), Number(month[2]) - 1, 1));
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
