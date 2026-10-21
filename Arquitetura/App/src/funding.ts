import { config as defaults, type Config } from "./config.ts";

export const STATES = ["kyc_passed", "ibkr_open", "deposit_notified", "partner_collected",
  "fx_executed", "wire_sent", "broker_credited", "invested"] as const;
export type State = (typeof STATES)[number] | "returned";
export type Lane = "ar_usdc" | "ar_swift" | "br_efx" | "br_fxbank";
export type Country = "AR" | "BR";

export type Deposit = { country: Country; lane: Lane; amountCents: number; state: State };
export type Ctx = {
  ibkrStatus: "pending" | "open" | "restricted" | "closed";
  sanctioned?: boolean;
  now: Date;
  clientSince: Date;          // OpenDollars onboarding date
  collectedAt?: Date;         // when the partner collected the Pix (BR)
  riskCleared?: boolean;      // risk score cleared the MED hold early
  quoteExpiresAt?: Date;      // partner FX quote validity
};

const DAY = 86_400_000;
const idx = (s: State) => STATES.indexOf(s as (typeof STATES)[number]);

// One client instruction -> exactly one lane, never split (splitting under the BR cap may be treated as evasion).
export function route(o: { country: Country; amountCents: number; sameDayCents?: number;
  preferUsdc?: boolean; usdcDeviationBps?: number }, cfg: Config = defaults): Lane {
  if (!Number.isInteger(o.amountCents)) throw new Error("amount_not_cents");
  if (!cfg.liveMarkets.includes(o.country)) throw new Error("market_not_live");
  if (o.amountCents < cfg.minMonthlyDepositCents) throw new Error("below_minimum");
  if (o.country === "AR") {
    const depegged = Math.abs(o.usdcDeviationBps ?? 0) > cfg.usdcDepegPauseBps;
    return (o.preferUsdc ?? true) && !depegged ? "ar_usdc" : "ar_swift";
  }
  return o.amountCents + (o.sameDayCents ?? 0) > cfg.brEfxCapCents ? "br_fxbank" : "br_efx";
}

// Forward one step at a time, or to 'returned' once money has left the client. Throws with the reason on any block.
export function advance(d: Deposit, to: State, ctx: Ctx, cfg: Config = defaults): State {
  const from = d.state;
  if (from === "returned" || from === "invested") throw new Error(`terminal:${from}`);
  if (ctx.sanctioned) throw new Error("sanctions_freeze"); // nothing moves, not even refunds, until the CCO decides
  if (to === "returned") {
    if (idx(from) < idx("partner_collected")) throw new Error("nothing_to_return");
    return to;
  }
  if (idx(to) !== idx(from) + 1) throw new Error(`bad_transition:${from}->${to}`);
  // B2: nothing moves until IBKR has opened the account; a restricted account stops new money too.
  if (ctx.ibkrStatus !== "open") throw new Error("ibkr_not_open");
  if (to === "fx_executed") {
    if (d.country === "BR" && medHoldActive(ctx, cfg)) throw new Error("pix_med_hold");
    if (d.lane !== "ar_usdc" && d.lane !== "ar_swift" && (!ctx.quoteExpiresAt || ctx.quoteExpiresAt <= ctx.now))
      throw new Error("quote_expired");
  }
  return to;
}

// B5: new Brazilian clients' Pix is held at the partner until the fraud-claim window passes or risk clears it.
export function medHoldActive(ctx: Ctx, cfg: Config = defaults): boolean {
  if (ctx.riskCleared) return false;
  const isNew = ctx.now.getTime() - ctx.clientSince.getTime() < cfg.newClientDays * DAY;
  if (!isNew) return false;
  if (!ctx.collectedAt) return true;
  return ctx.now.getTime() - ctx.collectedAt.getTime() < cfg.pixMedHoldDays * DAY;
}

// Recurring plans only pull money from clients we can still serve.
export const mayCollect = (ctx: Pick<Ctx, "ibkrStatus" | "sanctioned">) => ctx.ibkrStatus === "open" && !ctx.sanctioned;

// Full cost shown before every deposit (stress test 6.5). Advisory fee is annual and shown separately.
export function costPreview(lane: Lane, amountCents: number, cfg: Config = defaults) {
  const r = (x: number) => Math.round(x);
  const lines: Record<string, number> =
    lane === "ar_usdc" ? { usdc_conversion: Math.max(r(amountCents * cfg.usdcFeeRate), cfg.usdcFeeMinCents) }
    : lane === "ar_swift" ? { bank_wire: cfg.arSwiftFeeCents }
    : { iof: r(amountCents * cfg.brIofInvestment), fx_spread: r(amountCents * cfg.brPartnerSpread) };
  const totalCents = Object.values(lines).reduce((a, b) => a + b, 0);
  return { lines, totalCents, investedCents: amountCents - totalCents };
}
