// End to end on real Postgres: onboarding -> deposit -> IBKR notice -> partner -> credit -> monthly window
// -> fill -> statement import -> reconciliation, with a fake IBKR that keeps its own independent book.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type pg from "pg";
import { config } from "../src/config.ts";
import * as db from "../src/db.ts";
import type { Model } from "../src/portfolio.ts";
import { FakeIbkr, FakePartner } from "./support/fakes.ts";
import { havePg, startPg } from "./support/pg.ts";

const brLive = { ...config, liveMarkets: ["AR", "BR"] };
const model: Model = { id: "core", sleeves: [
  { exposure: "us_large", primary: "IE00B5BMR087", substitute: "IE00BFMXXD54", weight: 0.6 },
  { exposure: "world_exus", primary: "IE00BKM4GZ66", substitute: "IE00B3RBWM25", weight: 0.4 },
] };
const t0 = new Date("2026-11-02T13:00:00Z"); // Monday
const at = (h: number) => new Date(t0.getTime() + h * 3_600_000);
const quote = (now: Date) => ({ now, quoteExpiresAt: new Date(now.getTime() + 60_000) });

let pgc: Awaited<ReturnType<typeof startPg>>, pool: pg.Pool, ibkr: FakeIbkr, partner: FakePartner;
let n = 0;
const uid = () => `U${String(++n).padStart(7, "0")}`;
const senders = () => ({ ibkr, partners: { br_efx: partner, br_fxbank: partner } });
const q1 = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows[0];
const ledger = async (accountId: string) => Object.fromEntries((await pool.query(
  "SELECT bucket, SUM(cents)::bigint AS c FROM ledger_entries WHERE account_id = $1 GROUP BY 1", [accountId])).rows.map((r) => [r.bucket, Number(r.c)]));

async function client(country: "AR" | "BR", opts: { open?: boolean; since?: Date } = {}) {
  const { clientId, accountId } = await db.onboard(pool, country, opts.since ?? new Date(t0.getTime() - 365 * 86_400_000));
  await db.setKyc(pool, clientId, "passed");
  await db.assignModel(pool, accountId, model.id);
  const ibkrAccount = uid();
  if (opts.open !== false) await db.setIbkrStatus(pool, accountId, "open", ibkrAccount);
  return { clientId, accountId, ibkrAccount };
}

// Walks a deposit to broker_credited the way webhooks will, with IBKR's book moving in step.
async function fund(c: { accountId: string; ibkrAccount: string }, cents: number, key: string, cfg = config, now = t0) {
  const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: cents, idemKey: key, now }, cfg);
  await db.transition(pool, d.id, "ibkr_open", { now }, cfg);
  await db.transition(pool, d.id, "deposit_notified", { now }, cfg);
  await db.drainOutbox(pool, senders(), now);
  for (const s of ["partner_collected", "fx_executed", "wire_sent"] as const) await db.transition(pool, d.id, s, quote(now), cfg);
  const fees = cents - Math.round(cents * 0.997);
  ibkr.credit(c.ibkrAccount, cents - fees, `dep-${d.id}`);
  await db.transition(pool, d.id, "broker_credited", { now, creditedCents: cents - fees }, cfg);
  return { ...d, creditedCents: cents - fees };
}

// Our own deposits show up in IBKR's statement as positive Deposits/Withdrawals rows; we skip those on import.
const PRICES = { IE00B5BMR087: 100_00, IE00BKM4GZ66: 35_00 }; // per-share limits used to size whole-share orders
async function windowAndFill(when: Date, prices: Record<string, number>) {
  await db.runWindow(pool, { model, when, killSwitch: false, pricesCents: PRICES });
  await db.drainOutbox(pool, senders(), when);
  const ids = new Map((await pool.query("SELECT id, ibkr_account FROM accounts")).rows.map((r) => [r.ibkr_account, r.id]));
  for (const [key, o] of ibkr.orders) {
    if ((await q1("SELECT filled_at FROM orders WHERE idem_key = $1", [key])).filled_at) continue;
    const fills = ibkr.fill(key, prices[o.isin]);
    await db.recordFill(pool, key, Object.fromEntries(Object.entries(fills).map(([a, f]) => [ids.get(a), f])), when);
  }
}

describe("e2e", { skip: !havePg }, () => {
  before(async () => { pgc = await startPg(); pool = pgc.pool; });
  after(async () => { await pgc?.stop(); });
  beforeEach(async () => {
    ibkr = new FakeIbkr(); partner = new FakePartner();
    await pool.query("TRUNCATE ops_approvals, recon_breaks, orders, ibkr_cash_events, outbox, clients, accounts, deposits, deposit_events, ledger_entries, position_events RESTART IDENTITY CASCADE");
  });

  test("Argentina pilot journey: two clients, monthly window, fills, statement, zero breaks", async () => {
    const a = await client("AR"), b = await client("AR");
    const da = await fund(a, 1_000_00, "a-nov"), db_ = await fund(b, 250_00, "b-nov");
    assert.equal(da.lane, "ar_usdc");
    await windowAndFill(at(48), PRICES);

    const r = await db.importAndReconcile(pool, ibkr.statement(), at(72));
    assert.deepEqual(r.breaks, []);
    for (const d of [da, db_]) assert.equal((await q1("SELECT state FROM deposits WHERE id = $1", [d.id])).state, "invested");
    const la = await ledger(a.accountId);
    assert.equal(la.client_bank, -1_000_00);
    assert.equal(la.in_flight, 0);
    assert.equal(la["fees:ar_usdc"], 3_00);
    assert.equal(la.ibkr_cash + la.invested, da.creditedCents);
    assert.equal(Number((await q1("SELECT SUM(cents)::bigint AS s FROM ledger_entries")).s), 0); // whole book balances
    const events = (await pool.query("SELECT to_state FROM deposit_events WHERE deposit_id = $1 ORDER BY id", [da.id])).rows.map((x) => x.to_state);
    assert.deepEqual(events, ["ibkr_open", "deposit_notified", "partner_collected", "fx_executed", "wire_sent", "broker_credited", "invested"]);
  });

  test("B2: IBKR still pending -> nothing moves, nothing posted, nothing sent", async () => {
    const c = await client("AR", { open: false });
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    await assert.rejects(db.transition(pool, d.id, "ibkr_open", { now: t0 }), /ibkr_not_open/);
    await db.setIbkrStatus(pool, c.accountId, "restricted", c.ibkrAccount);
    await assert.rejects(db.transition(pool, d.id, "ibkr_open", { now: t0 }), /ibkr_not_open/);
    assert.equal((await q1("SELECT count(*)::int AS n FROM ledger_entries")).n, 0);
    assert.equal((await q1("SELECT count(*)::int AS n FROM outbox")).n, 0);
    assert.equal((await q1("SELECT state FROM deposits WHERE id = $1", [d.id])).state, "kyc_passed");
  });

  test("collection is refused until IBKR has the deposit notice; outbox retries with the same key", async () => {
    const c = await client("AR");
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    await db.transition(pool, d.id, "ibkr_open", { now: t0 });
    await db.transition(pool, d.id, "deposit_notified", { now: t0 });
    ibkr.failNext = 1;
    assert.deepEqual(await db.drainOutbox(pool, senders(), t0), { sent: 0, failed: 1 });
    const row = await q1("SELECT attempts, sent_at, last_error FROM outbox WHERE idem_key = $1", [`notify:${d.id}`]);
    assert.deepEqual([row.attempts, row.sent_at, row.last_error], [1, null, "ibkr_503"]);
    await assert.rejects(db.transition(pool, d.id, "partner_collected", quote(t0)), /deposit_notice_not_sent/);
    assert.deepEqual(await db.drainOutbox(pool, senders(), t0), { sent: 1, failed: 0 });
    assert.deepEqual(await db.drainOutbox(pool, senders(), t0), { sent: 0, failed: 0 }); // nothing re-sent
    assert.deepEqual(ibkr.calls.map((x) => x.idemKey), [`notify:${d.id}`, `notify:${d.id}`]);
    assert.equal(ibkr.notices.size, 1);
    assert.equal(await db.transition(pool, d.id, "partner_collected", quote(t0)), "partner_collected");
  });

  test("a failing outbox row stops retrying after 10 attempts and stays visible for operations", async () => {
    const c = await client("AR");
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    await db.transition(pool, d.id, "ibkr_open", { now: t0 });
    await db.transition(pool, d.id, "deposit_notified", { now: t0 });
    ibkr.failNext = 99;
    for (let i = 0; i < 12; i++) await db.drainOutbox(pool, senders(), t0);
    assert.equal(ibkr.calls.length, 10);
    assert.equal((await q1("SELECT attempts FROM outbox")).attempts, 10);
  });

  test("atomicity: a rejected credit amount leaves state, ledger and audit trail untouched", async () => {
    const c = await client("AR");
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    for (const s of ["ibkr_open", "deposit_notified"] as const) await db.transition(pool, d.id, s, { now: t0 });
    await db.drainOutbox(pool, senders(), t0);
    for (const s of ["partner_collected", "fx_executed", "wire_sent"] as const) await db.transition(pool, d.id, s, quote(t0));
    const before = [(await q1("SELECT count(*)::int AS n FROM ledger_entries")).n, (await q1("SELECT count(*)::int AS n FROM deposit_events")).n];
    for (const creditedCents of [600_00, 0, undefined, 10.5])
      await assert.rejects(db.transition(pool, d.id, "broker_credited", { now: t0, creditedCents }), /bad_credited_amount/);
    assert.equal((await q1("SELECT state FROM deposits WHERE id = $1", [d.id])).state, "wire_sent");
    assert.deepEqual([(await q1("SELECT count(*)::int AS n FROM ledger_entries")).n, (await q1("SELECT count(*)::int AS n FROM deposit_events")).n], before);
  });

  test("concurrency: the same webhook delivered twice at once moves the deposit exactly once", async () => {
    const c = await client("AR");
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    const results = await Promise.allSettled([1, 2, 3].map(() => db.transition(pool, d.id, "ibkr_open", { now: t0 })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await q1("SELECT count(*)::int AS n FROM deposit_events")).n, 1);
  });

  test("deposit creation: idempotent, conflicting replay refused, KYC and sanctions enforced", async () => {
    const c = await client("AR");
    const x = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "same", now: t0 });
    const y = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "same", now: t0 });
    assert.equal(x.id, y.id);
    await assert.rejects(db.createDeposit(pool, { accountId: c.accountId, amountCents: 600_00, idemKey: "same", now: t0 }), /idem_conflict/);
    await db.setSanctioned(pool, c.clientId, true);
    await assert.rejects(db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "s", now: t0 }), /sanctions_freeze/);
    await assert.rejects(db.transition(pool, x.id, "ibkr_open", { now: t0 }), /sanctions_freeze/);
    const fresh = await db.onboard(pool, "AR", t0);
    await assert.rejects(db.createDeposit(pool, { accountId: fresh.accountId, amountCents: 500_00, idemKey: "f", now: t0 }), /kyc_not_passed/);
    await assert.rejects(db.createDeposit(pool, { accountId: fresh.accountId, amountCents: 100_00, idemKey: "g", now: t0 }), /kyc_not_passed/);
  });

  test("Brazil: off by default; >$10k and same-day pieces go to the FX bank; Pix hold; partner told only after the notice", async () => {
    const c = await client("BR", { since: new Date(t0.getTime() - 5 * 86_400_000) }); // new client
    await assert.rejects(db.createDeposit(pool, { accountId: c.accountId, amountCents: 1_000_00, idemKey: "off", now: t0 }), /market_not_live/);
    const big = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 15_000_00, idemKey: "big", now: t0 }, brLive);
    assert.equal(big.lane, "br_fxbank");
    const p1 = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 6_000_00, idemKey: "p1", now: at(26) }, brLive);
    const p2 = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 6_000_00, idemKey: "p2", now: at(27) }, brLive);
    assert.deepEqual([p1.lane, p2.lane], ["br_efx", "br_fxbank"]);
    const p3 = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 6_000_00, idemKey: "p3", now: at(50) }, brLive);
    assert.equal(p3.lane, "br_efx"); // next São Paulo day starts fresh

    await db.transition(pool, p1.id, "ibkr_open", { now: at(26) }, brLive);
    await db.transition(pool, p1.id, "deposit_notified", { now: at(26) }, brLive);
    assert.equal(partner.instructions.size, 0);
    await db.drainOutbox(pool, senders(), at(26)); // sends notice, enqueues partner instruction
    await db.drainOutbox(pool, senders(), at(26));
    assert.deepEqual([...partner.instructions.keys()], [`collect:${p1.id}`]);
    await db.transition(pool, p1.id, "partner_collected", quote(at(26)), brLive);
    await assert.rejects(db.transition(pool, p1.id, "fx_executed", quote(at(30)), brLive), /pix_med_hold/);
    await assert.rejects(db.transition(pool, p1.id, "fx_executed", { now: at(26 + 8 * 24) }, brLive), /quote_expired/);
    assert.equal(await db.transition(pool, p1.id, "fx_executed", quote(at(26 + 8 * 24)), brLive), "fx_executed");
  });

  test("returned wire puts the money back on the client side of the ledger", async () => {
    const c = await client("AR");
    const d = await db.createDeposit(pool, { accountId: c.accountId, amountCents: 500_00, idemKey: "k", now: t0 });
    for (const s of ["ibkr_open", "deposit_notified"] as const) await db.transition(pool, d.id, s, { now: t0 });
    await db.drainOutbox(pool, senders(), t0);
    for (const s of ["partner_collected", "fx_executed", "wire_sent"] as const) await db.transition(pool, d.id, s, quote(t0));
    await db.transition(pool, d.id, "returned", { now: t0 });
    assert.deepEqual(await ledger(c.accountId), { client_bank: 0, in_flight: 0 });
    await assert.rejects(db.transition(pool, d.id, "broker_credited", { now: t0, creditedCents: 1 }), /terminal/);
  });

  test("windows: re-run is a no-op, unfilled orders reserve cash, restricted accounts sit out", async () => {
    const a = await client("AR"), r = await client("AR");
    await fund(a, 1_000_00, "a"); await fund(r, 1_000_00, "r");
    await db.setIbkrStatus(pool, r.accountId, "restricted");
    await assert.rejects(db.runWindow(pool, { model, when: at(48), killSwitch: false }), /prices_required_for_whole_share_orders/);
    assert.equal(await db.runWindow(pool, { model, when: at(48), killSwitch: false, pricesCents: PRICES }), 2);
    assert.equal(await db.runWindow(pool, { model, when: at(49), killSwitch: false, pricesCents: PRICES }), 0); // same month
    const allocated = (await pool.query("SELECT allocations FROM orders")).rows.flatMap((o) => Object.keys(o.allocations));
    assert.deepEqual([...new Set(allocated)], [a.accountId]);
    // Orders not yet filled: December's window may only use the leftover, never the same cash again.
    await db.runWindow(pool, { model, when: new Date("2026-12-01T13:00:00Z"), killSwitch: false, pricesCents: PRICES });
    await db.runWindow(pool, { model, when: new Date("2027-01-04T13:00:00Z"), killSwitch: false, pricesCents: PRICES });
    const committed = (await pool.query("SELECT allocations FROM orders WHERE filled_at IS NULL")).rows
      .reduce((s, o) => s + (o.allocations[a.accountId]?.cents ?? 0), 0);
    assert.ok(committed <= (await ledger(a.accountId)).ibkr_cash, `committed ${committed}`);
    assert.ok(committed > 997_00 - 100_00, "whole-share leftover is picked up by later windows");
    assert.equal(await db.runWindow(pool, { model, when: new Date("2026-12-01T13:00:00Z"), killSwitch: true }), 0);
  });

  test("fills are idempotent and refuse accounts the order did not allocate", async () => {
    const a = await client("AR"), other = await client("AR", { open: false });
    await fund(a, 1_000_00, "a");
    await db.runWindow(pool, { model, when: at(48), killSwitch: false, pricesCents: PRICES });
    const key = (await q1("SELECT idem_key FROM orders ORDER BY idem_key LIMIT 1")).idem_key;
    await assert.rejects(db.recordFill(pool, key, { [other.accountId]: { shares: 1, cents: 100 } }, at(50)), /fill_for_unallocated_account/);
    await db.recordFill(pool, key, { [a.accountId]: { shares: 1, cents: 597_00 } }, at(50));
    await db.recordFill(pool, key, { [a.accountId]: { shares: 1, cents: 597_00 } }, at(51));
    assert.equal((await q1("SELECT count(*)::int AS n FROM position_events")).n, 1);
    assert.equal((await ledger(a.accountId)).invested, 597_00);
  });

  test("B4 and recon: portal withdrawal and interest mirrored once; surprise deposit is a break that goes overdue, then resolves", async () => {
    const a = await client("AR");
    await fund(a, 1_000_00, "a");
    ibkr.withdraw(a.ibkrAccount, 100_00, "W1"); // client withdraws part of it in IBKR's portal before the window
    ibkr.interest(a.ibkrAccount, 12, "I1");
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), at(24))).breaks, []);
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), at(25))).breaks, []); // re-import: no double posting
    assert.equal((await ledger(a.accountId)).client_bank, -1_000_00 + 100_00);
    await windowAndFill(at(48), PRICES); // invests only what is left
    assert.ok((await ledger(a.accountId)).invested <= 997_00 - 100_00 + 12);
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), at(72))).breaks, []);

    ibkr.credit(a.ibkrAccount, 50_00, "X1"); // a wire we never originated
    const fri = new Date("2026-11-06T22:00:00Z"), mon = new Date("2026-11-09T22:00:00Z"), tue = new Date("2026-11-10T22:00:00Z");
    const r1 = await db.importAndReconcile(pool, ibkr.statement(), fri);
    assert.equal(r1.breaks.length, 1);
    assert.equal(r1.breaks[0].ibkr - r1.breaks[0].ours, 50_00);
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), mon)).overdue, []);
    assert.equal((await db.importAndReconcile(pool, ibkr.statement(), tue)).overdue.length, 1);
    assert.equal((await q1("SELECT count(*)::int AS n FROM recon_breaks WHERE resolved_at IS NULL")).n, 1); // one open row, not one per day

    const ack = { ibkrTxnId: "X1", accountId: a.accountId, cents: 50_00, recordedBy: "ana", now: tue };
    await assert.rejects(db.acknowledgeUnexpectedCash(pool, { ...ack, approvedBy: "ana" }), /four_eyes_required/);
    await db.acknowledgeUnexpectedCash(pool, { ...ack, approvedBy: "bruno" });
    await assert.rejects(db.acknowledgeUnexpectedCash(pool, { ...ack, approvedBy: "bruno" }), /already_recorded/);
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), tue)).breaks, []);
    ibkr.withdraw(a.ibkrAccount, 50_00, "W2"); // ops then returns the stray wire to the client
    assert.deepEqual((await db.importAndReconcile(pool, ibkr.statement(), tue)).breaks, []);
    assert.equal((await q1("SELECT count(*)::int AS n FROM recon_breaks WHERE resolved_at IS NULL")).n, 0);
  });

  test("database refuses an edit to history even from the app's own connection", async () => {
    const a = await client("AR");
    await fund(a, 500_00, "a");
    await assert.rejects(pool.query("UPDATE ledger_entries SET cents = cents + 1"), /append-only/);
    await assert.rejects(pool.query("DELETE FROM deposit_events"), /append-only/);
  });
});
