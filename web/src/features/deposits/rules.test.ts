import { describe, expect, it } from "vitest";
import type { Account, AppConfig, BlockReason, Quote, RailOption } from "@/api/types";
import { config } from "@/mocks/fixtures";
import { clockOffset } from "@/lib/clock";
import { accountBlock, amountSchema, isQuoteExpired, visibleOptions } from "./rules";

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("monthly plan amount", () => {
  // Mock config: minRecurringUsdCents 25000 (US$ 250), minDepositUsdCents 10000.
  const schema = amountSchema(config, "es", "recurring");

  it("uses the monthly minimum, not the one-off one", () => {
    expect(issues(schema.safeParse({ amount: "249,99" }))).toEqual(["belowMinimum"]);
    expect(issues(schema.safeParse({ amount: "100" }))).toEqual(["belowMinimum"]);
    const result = schema.safeParse({ amount: "250" });
    expect(result.success && result.data.amountCents).toBe(25000);
  });

  it("reads the amount in the client's locale and refuses another locale's format", () => {
    const result = schema.safeParse({ amount: "1.000,5" });
    expect(result.success && result.data.amountCents).toBe(100050);
    expect(issues(schema.safeParse({ amount: "1,000.50" }))).toEqual(["invalidAmount"]);
  });
});

describe("amount", () => {
  const schema = amountSchema(config, "es");

  it("reads the amount in the client's locale, as whole cents", () => {
    const result = schema.safeParse({ amount: "1.250,50" });
    expect(result.success && result.data.amountCents).toBe(125050);
  });

  it("accepts the minimum from the config", () => {
    expect(schema.safeParse({ amount: "100" }).success).toBe(true);
  });

  it("explains an amount below the minimum", () => {
    expect(issues(schema.safeParse({ amount: "99,99" }))).toEqual(["belowMinimum"]);
  });

  it.each(["abc", "", "1.234,567", "-50"])("refuses %j as an amount", (amount) => {
    expect(issues(schema.safeParse({ amount }))).toEqual(["invalidAmount"]);
  });
});

describe("rails", () => {
  const option = (rail: RailOption["rail"]): RailOption => ({
    rail,
    recommended: false,
    costs: [],
    totalCostCents: 0,
    netToInvestCents: 0,
    expectedDays: { min: 0, max: 1 },
  });
  const all = [option("ar_usdc"), option("ar_swift"), option("br_efx"), option("br_fxbank")];

  it("hides Brazilian rails while Brazil is not live", () => {
    expect(visibleOptions(all, config).map((o) => o.rail)).toEqual(["ar_usdc", "ar_swift"]);
  });

  it("shows them once BR is in liveMarkets", () => {
    const withBrazil: AppConfig = { ...config, liveMarkets: ["AR", "BR"] };
    expect(visibleOptions(all, withBrazil).map((o) => o.rail)).toEqual([
      "ar_usdc",
      "ar_swift",
      "br_efx",
      "br_fxbank",
    ]);
  });
});

describe("account blocks", () => {
  const account = (blockReasons: BlockReason[]): Account => ({
    status: "open",
    pending: [],
    blockReasons,
  });

  it("puts a restricted account first, with support as the action", () => {
    expect(accountBlock(account(["ibkr_not_open", "ibkr_restricted"]))).toEqual({
      reason: "ibkr_restricted",
      action: "support",
    });
  });

  it.each([
    ["compliance_hold", "support"],
    ["ibkr_not_open", "followUp"],
    ["market_not_live", "waitlist"],
  ] as const)("%s → %s", (reason, action) => {
    expect(accountBlock(account([reason]))).toEqual({ reason, action });
  });

  it("ignores deposit-level reasons and an account with none", () => {
    expect(accountBlock(account(["quote_expired", "pix_med_hold"]))).toBeNull();
    expect(accountBlock(account([]))).toBeNull();
  });
});

describe("quote expiry and the device clock", () => {
  const quote = { expiresAt: "2026-10-31T12:05:00Z" } as Quote;
  const at = (iso: string) => Date.parse(iso);

  it("expires exactly at expiresAt", () => {
    expect(isQuoteExpired(quote, at("2026-10-31T12:04:59.999Z"))).toBe(false);
    expect(isQuoteExpired(quote, at("2026-10-31T12:05:00Z"))).toBe(true);
  });

  it("measures how far the device clock is from the server's Date header", () => {
    // The phone is 10 minutes behind the server.
    const offset = clockOffset("Sat, 31 Oct 2026 12:00:00 GMT", at("2026-10-31T11:50:00Z"));
    expect(offset).toBe(10 * 60_000);
    // Corrected, the quote is still valid two minutes after the server issued it.
    expect(isQuoteExpired(quote, at("2026-10-31T11:52:00Z") + offset)).toBe(false);
  });

  it("ignores a missing or unreadable Date header and sub-second noise", () => {
    expect(clockOffset(null, at("2026-10-31T12:00:00Z"))).toBe(0);
    expect(clockOffset("yesterday", at("2026-10-31T12:00:00Z"))).toBe(0);
    expect(clockOffset("Sat, 31 Oct 2026 12:00:00 GMT", at("2026-10-31T12:00:00.800Z"))).toBe(0);
  });
});
