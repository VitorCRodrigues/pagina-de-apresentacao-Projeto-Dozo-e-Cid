import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config.ts";
import { aggregate, preTradeCheck, windowId, type Account, type Model } from "../src/portfolio.ts";

const model: Model = { id: "core", sleeves: [
  { exposure: "us_large", primary: "IE00B5BMR087", substitute: "IE00BFMXXD54", weight: 0.6 },
  { exposure: "world_exus", primary: "IE00BKM4GZ66", substitute: "IE00B3RBWM25", weight: 0.4 },
] };
const when = new Date("2026-11-03T15:00:00Z");
const acct = (id: string, cashCents: number, ibkrStatus = "open", sanctioned = false): Account => ({ id, cashCents, ibkrStatus, sanctioned });
const sumAlloc = (o: { allocations: Record<string, { cents: number }> }) => Object.values(o.allocations).reduce((s, a) => s + a.cents, 0);

test("one order per instrument, allocations sum to the order", () => {
  const orders = aggregate({ model, accounts: [acct("A", 1_000_00), acct("B", 250_00)], when, killSwitch: false });
  assert.deepEqual(orders.map((o) => o.isin), ["IE00B5BMR087", "IE00BKM4GZ66"]);
  assert.equal(orders[0].cents, 750_00);
  for (const o of orders) assert.equal(o.cents, sumAlloc(o));
});

test("never allocates more cash than an account holds (odd cents)", () => {
  const orders = aggregate({ model, accounts: [acct("A", 333_33)], when, killSwitch: false });
  const spent = orders.reduce((s, o) => s + o.allocations.A.cents, 0);
  assert.ok(spent <= 333_33 && spent >= 333_31, `spent ${spent}`);
});

test("idempotent window keys: same month same key, next month new key", () => {
  const k = (d: Date) => aggregate({ model, accounts: [acct("A", 500_00)], when: d, killSwitch: false })[0].idemKey;
  assert.equal(k(new Date("2026-11-01T00:00:00Z")), k(new Date("2026-11-30T23:59:59Z")));
  assert.notEqual(k(new Date("2026-11-30T23:59:59Z")), k(new Date("2026-12-01T00:00:00Z")));
  assert.equal(windowId(new Date("2026-01-05T00:00:00Z")), "2026-01");
});

test("skips accounts that are not open, sanctioned or have no cash", () => {
  const orders = aggregate({ model, accounts: [acct("A", 500_00), acct("R", 500_00, "restricted"),
    acct("S", 500_00, "open", true), acct("Z", 0), acct("P", 500_00, "pending")], when, killSwitch: false });
  for (const o of orders) assert.deepEqual(Object.keys(o.allocations), ["A"]);
  assert.deepEqual(aggregate({ model, accounts: [acct("R", 500_00, "closed")], when, killSwitch: false }), []);
});

test("kill switch sends nothing", () => {
  assert.deepEqual(aggregate({ model, accounts: [acct("A", 500_00)], when, killSwitch: true }), []);
});

test("substitute used when primary unavailable; both unavailable fails loudly", () => {
  const orders = aggregate({ model, accounts: [acct("A", 500_00)], when, killSwitch: false, unavailable: new Set(["IE00BKM4GZ66"]) });
  assert.deepEqual(orders.map((o) => o.isin), ["IE00B5BMR087", "IE00B3RBWM25"]);
  assert.throws(() => aggregate({ model, accounts: [acct("A", 500_00)], when, killSwitch: false,
    unavailable: new Set(["IE00BKM4GZ66", "IE00B3RBWM25"]) }), /no_instrument:world_exus/);
});

test("substitute that equals another sleeve's primary merges, not overwrites", () => {
  const m: Model = { id: "m", sleeves: [
    { exposure: "a", primary: "IE00000000A1", substitute: "IE00000000X1", weight: 0.5 },
    { exposure: "b", primary: "IE00000000B1", substitute: "IE00000000A1", weight: 0.5 },
  ] };
  const [o] = aggregate({ model: m, accounts: [acct("A", 1_000_00)], when, killSwitch: false, unavailable: new Set(["IE00000000B1"]) });
  assert.equal(o.isin, "IE00000000A1");
  assert.equal(o.allocations.A.cents, 1_000_00);
});

test("whole-share mode: floors to shares, leftover stays as cash, needs prices", () => {
  const prices = { IE00B5BMR087: 100_00, IE00BKM4GZ66: 33_00 };
  const orders = aggregate({ model, accounts: [acct("A", 1_000_00), acct("B", 150_00)], when, killSwitch: false, pricesCents: prices });
  const [us, world] = orders;
  assert.deepEqual(us.allocations, { A: { cents: 600_00, shares: 6 } }); // B's $90 buys no $100 share
  assert.deepEqual(world.allocations, { A: { cents: 396_00, shares: 12 }, B: { cents: 33_00, shares: 1 } });
  assert.equal(world.shares, 13);
  for (const o of orders) assert.equal(o.cents, sumAlloc(o));
  assert.throws(() => aggregate({ model, accounts: [acct("A", 500_00)], when, killSwitch: false,
    pricesCents: { IE00B5BMR087: 100_00 } }), /no_price:IE00BKM4GZ66/);
});

test("pre-trade checks guard the estate promise and fat-finger models", () => {
  const s = model.sleeves;
  assert.doesNotThrow(() => preTradeCheck(model));
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [] }), /empty_model/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [{ ...s[0], weight: 1 }] }), /max_weight/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [{ ...s[0], weight: 0.5 }, { ...s[1], weight: 0.4 }] }), /weights_not_100/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [{ ...s[0], weight: 1.2 }, { ...s[1], weight: -0.2 }] }), /bad_weight/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [{ ...s[0], primary: "US78462F1030" }, s[1]] }), /us_situs_in_core/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [s[0], { ...s[1], substitute: "US9229087690" }] }), /us_situs_in_core/);
  assert.throws(() => preTradeCheck({ id: "x", sleeves: [s[0], { ...s[1], exposure: "us_large" }] }), /duplicate_exposure/);
});

test("turnover against the previous model: limit is inclusive", () => {
  const w = (a: number, b: number): Model => ({ id: "x", sleeves: [{ ...model.sleeves[0], weight: a }, { ...model.sleeves[1], weight: b }] });
  const loose = { ...config, maxWeight: 1 }; // isolate the turnover rule from the weight cap
  assert.doesNotThrow(() => preTradeCheck(w(0.3, 0.7), w(0.6, 0.4), loose));      // exactly 30%
  assert.throws(() => preTradeCheck(w(0.2, 0.8), w(0.6, 0.4), loose), /max_turnover/); // 40%
  const added: Model = { id: "x", sleeves: [{ ...model.sleeves[0], weight: 0.5 }, { ...model.sleeves[1], weight: 0.4 },
    { exposure: "bonds", primary: "IE00B3F81R35", substitute: "IE00BDBRDM35", weight: 0.1 }] };
  assert.doesNotThrow(() => preTradeCheck(added, model));                    // new sleeve counts as turnover: 10%
});
