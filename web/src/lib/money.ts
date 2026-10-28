import type { Locale } from "@/api/types";
import { toIntlLocale } from "./locale";

// Money is always integer USD cents (PRD section 8). Floats never touch an amount:
// sums stay in integers and formatting goes through a decimal string.

export function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Money must be integer cents, got ${String(value)}`);
  }
}

export function sumCents(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
  }
  assertCents(total);
  return total;
}

// 12345 -> "123.45", -5 -> "-0.05". Pure string work, no division.
export function centsToDecimalString(cents: number): `${number}` {
  assertCents(cents);
  const digits = String(Math.abs(cents)).padStart(3, "0");
  const sign = cents < 0 ? "-" : "";
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}` as `${number}`;
}

const currencyFormats = new Map<Locale, Intl.NumberFormat>();

function currencyFormat(locale: Locale): Intl.NumberFormat {
  let format = currencyFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(toIntlLocale(locale), { style: "currency", currency: "USD" });
    currencyFormats.set(locale, format);
  }
  return format;
}

export function formatMoney(cents: number, locale: Locale): string {
  return currencyFormat(locale).format(centsToDecimalString(cents));
}

export function formatMoneyParts(cents: number, locale: Locale): Intl.NumberFormatPart[] {
  return currencyFormat(locale).formatToParts(centsToDecimalString(cents));
}

// Percentage of an amount, rounded half up, in integers only (30 bp = 0.30%).
export function applyBasisPoints(cents: number, basisPoints: number): number {
  assertCents(cents);
  assertCents(basisPoints);
  return Math.floor((cents * basisPoints + 5000) / 10000);
}

// What the client types in an amount field, read in their locale: "1.234,5" in es/pt,
// "1,234.50" in en. Anything ambiguous or out of range is null, never a guess.
export function parseAmountToCents(input: string, locale: Locale): number | null {
  const decimal = locale === "en" ? "." : ",";
  const group = locale === "en" ? "," : ".";
  const text = input.replace(/US\$|\$|\s/gu, "");
  if (text === "") return null;

  const d = `\\${decimal}`;
  const g = `\\${group}`;
  const pattern = new RegExp(`^(\\d{1,3}(?:${g}\\d{3})+|\\d+)(?:${d}(\\d{1,2}))?$`);
  const match = pattern.exec(text);
  if (!match) return null;

  const whole = (match[1] ?? "").replaceAll(group, "");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = Number.parseInt(`${whole}${fraction}`, 10);
  return Number.isSafeInteger(cents) ? cents : null;
}

// Ratios such as CostLine.percent (0.011 = 1.1%) are display-only values from the API.
export function formatPercent(ratio: number, locale: Locale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(ratio);
}
