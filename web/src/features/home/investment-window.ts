import type { ProposedConfig } from "@/api/proposed-types";
import type { Deposit, Locale } from "@/api/types";
import { formatDate } from "@/lib/dates";

// The next window on config.investmentWindowDay: this month's while the day has not passed,
// otherwise next month's. Only a fallback for when the server sends no date.
// TODO(decisão): the window's hour and time zone are not defined, so on the day itself it
// stays "today" (the calendar day is read in UTC).
export function nextInvestmentWindow(now: Date, day: number): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const onDay = (m: number) => {
    const lastDay = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, m, Math.min(day, lastDay)));
  };
  const thisMonth = onDay(month);
  return (now.getUTCDate() <= thisMonth.getUTCDate() ? thisMonth : onDay(month + 1)).toISOString();
}

interface WindowSources {
  config: Pick<ProposedConfig, "investmentWindowDay" | "nextInvestmentWindow">;
  deposits: readonly Pick<Deposit, "nextInvestmentWindow">[];
  now: Date;
}

// The server's date wins: GET /config (api-gaps.md, item 8), then any deposit that carries one,
// and only then the local calculation.
export function resolveInvestmentWindow({ config, deposits, now }: WindowSources): string {
  return (
    config.nextInvestmentWindow ??
    deposits.find((deposit) => deposit.nextInvestmentWindow)?.nextInvestmentWindow ??
    nextInvestmentWindow(now, config.investmentWindowDay)
  );
}

// A window is a calendar day, shown without a time. Read in UTC, so a client west of Greenwich
// does not see midnight UTC as the day before.
export function formatWindowDate(iso: string, locale: Locale): string {
  return formatDate(iso, locale, { timeZone: "UTC" });
}
