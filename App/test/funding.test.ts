import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, costPreview, mayCollect, medHoldActive, route, STATES, type Ctx, type Deposit } from "../src/funding.ts";
import { config } from "../src/config.ts";

const now = new Date("2026-11-02T15:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
const brLive = { ...config, liveMarkets: ["AR", "BR"] };
const ok: Ctx = { ibkrStatus: "open", now, clientSince: days(365), quoteExpiresAt: new Date(now.getTime() + 60_000) };
const dep = (state: Deposit["state"], country: Deposit["country"] = "AR", lane: Deposit["lane"] = "ar_usdc"): Deposit =>
  ({ country, lane, amountCents: 500_00, state });

test("route: Argentina defaults to USDC, falls back to SWIFT on request or depeg", () => {
  assert.equal(route({ country: "AR", amountCents: 300_00 }), "ar_usdc");
  assert.equal(route({ country: "AR", amountCents: 300_00, preferUsdc: false }), "ar_swift");
  assert.equal(route({ country: "AR", amountCents: 300_00, usdcDeviationBps: 50 }), "ar_usdc");   // at threshold: still ok
  assert.equal(route({ country: "AR", amountCents: 300_00, usdcDeviationBps: 51 }), "ar_swift");
  assert.equal(route({ country: "AR", amountCents: 300_00, usdcDeviationBps: -80 }), "ar_swift"); // depeg either way
});

test("route: minimum deposit, integer cents only", () => {
  assert.equal(route({ country: "AR", amountCents: 250_00 }), "ar_usdc");
  assert.throws(() => route({ country: "AR", amountCents: 249_99 }), /below_minimum/);
  assert.throws(() => route({ country: "AR", amountCents: 300.5 }), /amount_not_cents/);
});

test("route: Brazil is off until B1 is resolved", () => {
  assert.throws(() => route({ country: "BR", amountCents: 1_000_00 }), /market_not_live/);
});

test("route: Brazil $10k cap — never split, same-day pieces count", () => {
  assert.equal(route({ country: "BR", amountCents: 10_000_00 }, brLive), "br_efx");   // exactly at cap
  assert.equal(route({ country: "BR", amountCents: 10_000_01 }, brLive), "br_fxbank");
  assert.equal(route({ country: "BR", amountCents: 15_000_00 }, brLive), "br_fxbank");
  assert.equal(route({ country: "BR", amountCents: 6_000_00, sameDayCents: 6_000_00 }, brLive), "br_fxbank");
  assert.equal(route({ country: "BR", amountCents: 4_000_00, sameDayCents: 6_000_00 }, brLive), "br_efx");
});

test("advance: happy path walks every state in order", () => {
  let d = dep("kyc_passed");
  for (const s of STATES.slice(1)) d = { ...d, state: advance(d, s, ok) };
  assert.equal(d.state, "invested");
});

test("advance: B2 — no step while IBKR is pending, restricted or closed", () => {
  for (const ibkrStatus of ["pending", "restricted", "closed"] as const) {
    assert.throws(() => advance(dep("kyc_passed"), "ibkr_open", { ...ok, ibkrStatus }), /ibkr_not_open/);
    assert.throws(() => advance(dep("deposit_notified"), "partner_collected", { ...ok, ibkrStatus }), /ibkr_not_open/);
  }
});

test("advance: no skipping, no going backwards, terminal states stay terminal", () => {
  assert.throws(() => advance(dep("ibkr_open"), "partner_collected", ok), /bad_transition/); // skips deposit notice
  assert.throws(() => advance(dep("wire_sent"), "fx_executed", ok), /bad_transition/);
  assert.throws(() => advance(dep("invested"), "returned", ok), /terminal/);
  assert.throws(() => advance(dep("returned"), "partner_collected", ok), /terminal/);
});

test("advance: returns only once money has left the client", () => {
  for (const s of ["partner_collected", "fx_executed", "wire_sent", "broker_credited"] as const)
    assert.equal(advance(dep(s), "returned", ok), "returned");
  for (const s of ["kyc_passed", "ibkr_open", "deposit_notified"] as const)
    assert.throws(() => advance(dep(s), "returned", ok), /nothing_to_return/);
});

test("advance: sanctions freeze blocks every move, refunds included", () => {
  assert.throws(() => advance(dep("wire_sent"), "broker_credited", { ...ok, sanctioned: true }), /sanctions_freeze/);
  assert.throws(() => advance(dep("wire_sent"), "returned", { ...ok, sanctioned: true }), /sanctions_freeze/);
});

test("advance: FX needs a live quote on partner lanes, not on USDC", () => {
  const br = dep("partner_collected", "BR", "br_efx");
  assert.throws(() => advance(br, "fx_executed", { ...ok, quoteExpiresAt: now }), /quote_expired/);
  assert.throws(() => advance(br, "fx_executed", { ...ok, quoteExpiresAt: undefined }), /quote_expired/);
  assert.equal(advance(br, "fx_executed", ok), "fx_executed");
  assert.equal(advance(dep("partner_collected"), "fx_executed", { ...ok, quoteExpiresAt: undefined }), "fx_executed");
});

test("B5 Pix MED hold: new BR clients wait, risk clearance or time releases", () => {
  const br = dep("partner_collected", "BR", "br_efx");
  const fresh: Ctx = { ...ok, clientSince: days(10), collectedAt: days(2) };
  assert.throws(() => advance(br, "fx_executed", fresh), /pix_med_hold/);
  assert.equal(advance(br, "fx_executed", { ...fresh, riskCleared: true }), "fx_executed");
  assert.equal(advance(br, "fx_executed", { ...fresh, collectedAt: days(8) }), "fx_executed");
  assert.equal(advance(br, "fx_executed", { ...fresh, clientSince: days(120) }), "fx_executed");
  assert.equal(medHoldActive({ ...fresh, collectedAt: undefined }), true);  // no collection time: hold
  assert.equal(advance(dep("partner_collected"), "fx_executed", fresh), "fx_executed"); // AR unaffected
});

test("recurring plans pause for restricted or sanctioned accounts", () => {
  assert.equal(mayCollect({ ibkrStatus: "open" }), true);
  assert.equal(mayCollect({ ibkrStatus: "restricted" }), false);
  assert.equal(mayCollect({ ibkrStatus: "open", sanctioned: true }), false);
});

test("cost preview: every lane itemised and adds up", () => {
  assert.equal(costPreview("ar_usdc", 250_00).lines.usdc_conversion, 1_00); // 0.30% = $0.75, US$1 minimum applies
  const usdc = costPreview("ar_usdc", 1_000_00);
  assert.deepEqual(usdc.lines, { usdc_conversion: 3_00 });
  assert.equal(costPreview("ar_usdc", 200).lines.usdc_conversion, 1_00); // US$1 minimum
  assert.equal(costPreview("ar_swift", 250_00).totalCents, 35_00);
  const br = costPreview("br_efx", 1_000_00);
  assert.deepEqual(br.lines, { iof: 11_00, fx_spread: 7_50 });
  for (const c of [usdc, br]) assert.equal(c.totalCents + c.investedCents, 1_000_00);
});
