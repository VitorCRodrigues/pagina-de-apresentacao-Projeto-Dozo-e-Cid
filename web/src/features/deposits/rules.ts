import { z } from "@/lib/zod";
import type { Account, AppConfig, BlockReason, Locale, Quote, RailOption } from "@/api/types";
import { parseAmountToCents } from "@/lib/money";

// PRD section 5 rules for a new deposit. The backend enforces them all; these only guide the
// client, always with the values from GET /config.

export type AmountError = "invalidAmount" | "belowMinimum";

// One-off deposits use config.minDepositUsdCents, the monthly plan (T5) minRecurringUsdCents.
// Errors are codes on the "amount" field; screens translate them. The output is whole cents.
export function amountField(
  config: AppConfig,
  locale: Locale,
  kind: "oneOff" | "recurring" = "oneOff",
) {
  const minimum = kind === "recurring" ? config.minRecurringUsdCents : config.minDepositUsdCents;
  return z.string().transform((text, ctx) => {
    const cents = parseAmountToCents(text, locale);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "invalidAmount" satisfies AmountError });
      return z.NEVER;
    }
    if (cents < minimum) {
      ctx.addIssue({ code: "custom", message: "belowMinimum" satisfies AmountError });
      return z.NEVER;
    }
    return cents;
  });
}

export function amountSchema(
  config: AppConfig,
  locale: Locale,
  kind: "oneOff" | "recurring" = "oneOff",
) {
  return z
    .object({ amount: amountField(config, locale, kind) })
    .transform(({ amount }) => ({ amountCents: amount }));
}

// Rails of the live markets only: Brazil and br_* appear once "BR" is in liveMarkets.
export function visibleOptions(options: readonly RailOption[], config: AppConfig): RailOption[] {
  const allowed = new Set(config.liveMarkets.flatMap((country) => config.railsByCountry[country]));
  return options.filter((option) => allowed.has(option.rail));
}

export type BlockAction = "followUp" | "support" | "waitlist";

// Account-level reasons, most serious first (D5). quote_expired belongs to a quote and
// pix_med_hold to a deposit; neither blocks the whole screen.
const accountReasons: readonly [BlockReason, BlockAction][] = [
  ["ibkr_restricted", "support"],
  ["compliance_hold", "support"],
  ["ibkr_not_open", "followUp"],
  ["market_not_live", "waitlist"],
];

export function accountBlock(
  account: Account,
): { reason: BlockReason; action: BlockAction } | null {
  const found = accountReasons.find(([reason]) => account.blockReasons.includes(reason));
  return found ? { reason: found[0], action: found[1] } : null;
}

// `now` is the server's time as the device estimates it (Date.now() + clockOffset).
export function isQuoteExpired(quote: Pick<Quote, "expiresAt">, now: number): boolean {
  return now >= Date.parse(quote.expiresAt);
}
