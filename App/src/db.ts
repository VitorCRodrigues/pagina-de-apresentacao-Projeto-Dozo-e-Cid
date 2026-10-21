// Persistence for the pilot. Every state change, its ledger postings and its outbound messages commit together.
import pg from "pg";
import { randomUUID } from "node:crypto";
import { config as defaults, type Config } from "./config.ts";
import { advance, route, type Country, type Lane, type State } from "./funding.ts";
import { aggregate, type Model } from "./portfolio.ts";
import { transfer, type Entry } from "./ledger.ts";
import { overdue, parseCashTransactions, parseFlex, reconcile, type Row } from "./recon.ts";
import type { IbkrGateway, PartnerGateway } from "./gateways.ts";

type Db = pg.Pool;
type Tx = pg.PoolClient;

export async function withTx<T>(db: Db, fn: (c: Tx) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function post(c: Tx, entries: Entry[], at: Date) {
  for (const e of entries)
    await c.query("INSERT INTO ledger_entries (txn_id, account_id, bucket, cents, created_at) VALUES ($1,$2,$3,$4,$5)",
      [e.txnId, e.account, e.bucket, e.cents, at]);
}
const enqueue = (c: Tx, idemKey: string, target: string, payload: object, at: Date) =>
  c.query("INSERT INTO outbox (idem_key, target, payload, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (idem_key) DO NOTHING",
    [idemKey, target, payload, at]);

// ---------- onboarding ----------

export async function onboard(db: Db, country: Country, at: Date): Promise<{ clientId: string; accountId: string }> {
  return withTx(db, async (c) => {
    const { rows: [cl] } = await c.query("INSERT INTO clients (country, created_at) VALUES ($1,$2) RETURNING id", [country, at]);
    const { rows: [ac] } = await c.query("INSERT INTO accounts (client_id) VALUES ($1) RETURNING id", [cl.id]);
    return { clientId: cl.id, accountId: ac.id };
  });
}
export const setKyc = (db: Db, clientId: string, status: "passed" | "rejected" | "edd") =>
  db.query("UPDATE clients SET kyc_status = $2 WHERE id = $1", [clientId, status]);
export const setSanctioned = (db: Db, clientId: string, sanctioned: boolean) =>
  db.query("UPDATE clients SET sanctioned = $2 WHERE id = $1", [clientId, sanctioned]);
export const assignModel = (db: Db, accountId: string, modelId: string) =>
  db.query("UPDATE accounts SET model_id = $2 WHERE id = $1", [accountId, modelId]);
export const setIbkrStatus = (db: Db, accountId: string, status: "pending" | "open" | "restricted" | "closed", ibkrAccount?: string) =>
  db.query("UPDATE accounts SET ibkr_status = $2, ibkr_account = COALESCE($3, ibkr_account) WHERE id = $1", [accountId, status, ibkrAccount ?? null]);

// ---------- deposits ----------

export type NewDeposit = { accountId: string; amountCents: number; idemKey: string; now: Date; preferUsdc?: boolean; usdcDeviationBps?: number };

// Idempotent: the same idemKey returns the original deposit; a different payload under it is refused.
export async function createDeposit(db: Db, d: NewDeposit, cfg: Config = defaults): Promise<{ id: string; lane: Lane }> {
  return withTx(db, async (c) => {
    // Locking the account serialises deposits per client, so the same-day total below cannot race.
    const { rows: [a] } = await c.query(
      `SELECT a.id, c.country, c.kyc_status, c.sanctioned FROM accounts a JOIN clients c ON c.id = a.client_id
       WHERE a.id = $1 FOR UPDATE OF a`, [d.accountId]);
    if (!a) throw new Error("no_account");
    const { rows: [dup] } = await c.query("SELECT id, lane, account_id, amount_cents FROM deposits WHERE idem_key = $1", [d.idemKey]);
    if (dup) {
      if (dup.account_id !== d.accountId || Number(dup.amount_cents) !== d.amountCents) throw new Error("idem_conflict");
      return { id: dup.id, lane: dup.lane };
    }
    if (a.kyc_status !== "passed") throw new Error("kyc_not_passed");
    if (a.sanctioned) throw new Error("sanctions_freeze");
    // Same local calendar day in Brazil, excluding deposits that were returned.
    const { rows: [sd] } = await c.query(
      `SELECT COALESCE(SUM(amount_cents),0)::bigint AS s FROM deposits WHERE account_id = $1 AND state <> 'returned'
       AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = ($2::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date`,
      [d.accountId, d.now]);
    const lane = route({ country: a.country, amountCents: d.amountCents, sameDayCents: Number(sd.s),
      preferUsdc: d.preferUsdc, usdcDeviationBps: d.usdcDeviationBps }, cfg);
    const { rows: [row] } = await c.query(
      `INSERT INTO deposits (account_id, lane, amount_cents, idem_key, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
      [d.accountId, lane, d.amountCents, d.idemKey, d.now]);
    return { id: row.id, lane };
  });
}

export type Event = { now: Date; quoteExpiresAt?: Date; riskCleared?: boolean; creditedCents?: number };

// Move a deposit one step. Partner and IBKR webhooks call this; rules live in funding.advance().
export async function transition(db: Db, depositId: string, to: State, ev: Event, cfg: Config = defaults): Promise<State> {
  return withTx(db, async (c) => {
    const { rows: [d] } = await c.query(
      `SELECT d.*, a.ibkr_status, a.ibkr_account, c.country, c.sanctioned, c.created_at AS client_since
       FROM deposits d JOIN accounts a ON a.id = d.account_id JOIN clients c ON c.id = a.client_id
       WHERE d.id = $1 FOR UPDATE OF d`, [depositId]);
    if (!d) throw new Error("no_deposit");
    const amount = Number(d.amount_cents);
    // Money may only be collected once IBKR has actually been told to expect it.
    if (to === "partner_collected") {
      const { rows: [n] } = await c.query("SELECT sent_at FROM outbox WHERE idem_key = $1", [`notify:${d.id}`]);
      if (!n?.sent_at) throw new Error("deposit_notice_not_sent");
    }
    const next = advance({ country: d.country, lane: d.lane, amountCents: amount, state: d.state },
      to, { ibkrStatus: d.ibkr_status, sanctioned: d.sanctioned, now: ev.now, clientSince: d.client_since,
        collectedAt: d.collected_at ?? undefined, riskCleared: ev.riskCleared, quoteExpiresAt: ev.quoteExpiresAt }, cfg);

    let credited: number | null = d.credited_cents === null ? null : Number(d.credited_cents);
    const txn = randomUUID();
    if (next === "partner_collected") await post(c, transfer(txn, d.account_id, "client_bank", "in_flight", amount), ev.now);
    if (next === "broker_credited") {
      credited = ev.creditedCents ?? NaN;
      if (!Number.isInteger(credited) || credited <= 0 || credited > amount) throw new Error("bad_credited_amount");
      const entries = transfer(txn, d.account_id, "in_flight", "ibkr_cash", credited);
      if (amount > credited) entries.push(...transfer(txn, d.account_id, "in_flight", `fees:${d.lane}`, amount - credited));
      await post(c, entries, ev.now);
    }
    if (next === "returned") {
      // Before IBKR credits, the gross amount is still in flight; afterwards IBKR returns what it credited.
      // FX loss on a returned wire is the partner's under contract (stress test 3.3) and is not modelled here.
      await post(c, d.state === "broker_credited"
        ? transfer(txn, d.account_id, "ibkr_cash", "client_bank", credited!)
        : transfer(txn, d.account_id, "in_flight", "client_bank", amount), ev.now);
    }
    if (next === "deposit_notified")
      await enqueue(c, `notify:${d.id}`, "ibkr", { kind: "notify", depositId: d.id, ibkrAccount: d.ibkr_account,
        amountCents: amount, currency: "USD", lane: d.lane }, ev.now);

    await c.query(`UPDATE deposits SET state = $2, updated_at = $3,
      collected_at = CASE WHEN $2 = 'partner_collected' THEN $3 ELSE collected_at END, credited_cents = $4 WHERE id = $1`,
      [d.id, next, ev.now, credited]);
    await c.query("INSERT INTO deposit_events (deposit_id, from_state, to_state, at) VALUES ($1,$2,$3,$4)", [d.id, d.state, next, ev.now]);
    return next;
  });
}

// ---------- outbox worker ----------

export type Senders = { ibkr: IbkrGateway; partners: Record<string, PartnerGateway> };
const MAX_ATTEMPTS = 10; // after this a row stays unsent for operations to handle

// Sends each pending row at most once per call. A provider crash after accepting but before we mark sent_at is
// safe because the same idem_key is sent again. ponytail: row lock held during the call; fine at pilot volume.
export async function drainOutbox(db: Db, s: Senders, now: Date): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0, lastId = 0;
  for (;;) {
    const done = await withTx(db, async (c) => {
      const { rows: [r] } = await c.query(
        `SELECT * FROM outbox WHERE sent_at IS NULL AND attempts < $1 AND id > $2 ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [MAX_ATTEMPTS, lastId]);
      if (!r) return true;
      lastId = Number(r.id);
      const p = r.payload;
      try {
        if (p.kind === "notify") {
          await s.ibkr.notifyDeposit({ ibkrAccount: p.ibkrAccount, amountCents: p.amountCents, currency: "USD", reference: p.depositId, lane: p.lane }, r.idem_key);
          // Brazil: only now may the partner collect the Pix (B1/B2 ordering).
          if (p.lane === "br_efx" || p.lane === "br_fxbank")
            await enqueue(c, `collect:${p.depositId}`, `partner:${p.lane}`, { kind: "collect", depositId: p.depositId,
              amountCents: p.amountCents, lane: p.lane, ibkrAccount: p.ibkrAccount }, now);
        } else if (p.kind === "order") {
          await s.ibkr.placeAllocationOrder({ windowId: p.windowId, isin: p.isin, allocations: p.allocations }, r.idem_key);
        } else if (p.kind === "collect") {
          const partner = s.partners[p.lane];
          if (!partner) throw new Error(`no_partner:${p.lane}`);
          await partner.instructCollection({ depositId: p.depositId, amountCents: p.amountCents, lane: p.lane, ibkrAccount: p.ibkrAccount }, r.idem_key);
        } else throw new Error(`unknown_kind:${p.kind}`);
        await c.query("UPDATE outbox SET sent_at = $2, attempts = attempts + 1, last_error = NULL WHERE id = $1", [r.id, now]);
        sent++;
      } catch (e) {
        await c.query("UPDATE outbox SET attempts = attempts + 1, last_error = $2 WHERE id = $1", [r.id, String((e as Error).message).slice(0, 500)]);
        failed++;
      }
      return false;
    });
    if (done) return { sent, failed };
  }
}

// ---------- monthly window ----------

// Investable cash = IBKR cash in our ledger minus what unfilled orders already allocated.
export async function runWindow(db: Db, o: { model: Model; when: Date; killSwitch: boolean; unavailable?: Set<string>;
  pricesCents?: Record<string, number> }, cfg: Config = defaults): Promise<number> {
  if (cfg.wholeShareOrders && !o.pricesCents && !o.killSwitch) throw new Error("prices_required_for_whole_share_orders");
  return withTx(db, async (c) => {
    await c.query("LOCK TABLE orders IN SHARE ROW EXCLUSIVE MODE"); // one window run at a time
    const { rows } = await c.query(
      `SELECT a.id, a.ibkr_status, c.sanctioned, a.ibkr_account,
         COALESCE((SELECT SUM(cents) FROM ledger_entries l WHERE l.account_id = a.id AND l.bucket = 'ibkr_cash'), 0)
         - COALESCE((SELECT SUM((o.allocations -> a.id::text ->> 'cents')::bigint) FROM orders o WHERE o.filled_at IS NULL), 0) AS cash
       FROM accounts a JOIN clients c ON c.id = a.client_id WHERE a.model_id = $1`, [o.model.id]);
    const orders = aggregate({ ...o, accounts: rows.map((r) => ({ id: r.id, cashCents: Number(r.cash), ibkrStatus: r.ibkr_status, sanctioned: r.sanctioned })) }, cfg);
    const ibkrOf = new Map(rows.map((r) => [r.id, r.ibkr_account]));
    let created = 0;
    for (const ord of orders) {
      const ins = await c.query(
        "INSERT INTO orders (idem_key, window_id, isin, allocations, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [ord.idemKey, ord.windowId, ord.isin, ord.allocations, o.when]);
      if (!ins.rowCount) continue; // this window already ran for this instrument
      created++;
      const byIbkr = Object.fromEntries(Object.entries(ord.allocations).map(([id, a]) => [ibkrOf.get(id), a]));
      await enqueue(c, ord.idemKey, "ibkr", { kind: "order", windowId: ord.windowId, isin: ord.isin, allocations: byIbkr }, o.when);
    }
    return created;
  });
}

// Fill report from IBKR, per our account id. Idempotent; actual cents may differ from the allocation (price moved).
export async function recordFill(db: Db, idemKey: string, fills: Record<string, { shares: number; cents: number }>, now: Date): Promise<void> {
  await withTx(db, async (c) => {
    const { rows: [o] } = await c.query("SELECT * FROM orders WHERE idem_key = $1 FOR UPDATE", [idemKey]);
    if (!o) throw new Error("no_order");
    if (o.filled_at) return;
    const txn = randomUUID();
    for (const [account, f] of Object.entries(fills)) {
      if (!(account in o.allocations)) throw new Error(`fill_for_unallocated_account:${account}`);
      if (!(f.shares > 0) || !Number.isInteger(f.cents) || f.cents <= 0) throw new Error("bad_fill");
      await c.query("INSERT INTO position_events (account_id, isin, qty, source, created_at) VALUES ($1,$2,$3,$4,$5)",
        [account, o.isin, f.shares, idemKey, now]);
      await post(c, transfer(txn, account, "ibkr_cash", "invested", f.cents), now);
      // Deposits credited before this order was cut are now at work; later ones wait for the next window.
      const { rows: ds } = await c.query(
        "SELECT id FROM deposits WHERE account_id = $1 AND state = 'broker_credited' AND updated_at <= $2 FOR UPDATE", [account, o.created_at]);
      for (const d of ds) {
        await c.query("UPDATE deposits SET state = 'invested', updated_at = $2 WHERE id = $1", [d.id, now]);
        await c.query("INSERT INTO deposit_events (deposit_id, from_state, to_state, at) VALUES ($1,'broker_credited','invested',$2)", [d.id, now]);
      }
    }
    await c.query("UPDATE orders SET filled_at = $2 WHERE idem_key = $1", [idemKey, now]);
  });
}

// ---------- daily statement import + reconciliation ----------

// B4: withdrawals happen in IBKR's own portal (IBKR 2FA, client-named destinations only); the app never initiates
// one. We learn about them from the statement and mirror them, so reconciliation stays clean.
export async function importAndReconcile(db: Db, flexXml: string, now: Date) {
  const positions = parseFlex(flexXml), cashTxns = parseCashTransactions(flexXml);
  return withTx(db, async (c) => {
    const { rows: accts } = await c.query("SELECT id, ibkr_account FROM accounts WHERE ibkr_account IS NOT NULL");
    const idOf = new Map(accts.map((a) => [a.ibkr_account as string, a.id as string]));
    for (const t of cashTxns) {
      const account = idOf.get(t.account);
      if (!account) continue; // unknown account surfaces below as a break
      const ins = await c.query("INSERT INTO ibkr_cash_events (ibkr_txn_id, account_id, kind, cents) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [t.id, account, t.kind, t.cents]);
      if (!ins.rowCount) continue;
      const counter = t.kind === "withdrawal" ? "client_bank" : t.kind === "interest" ? "income:interest" : "fees:ibkr";
      const txn = randomUUID(); // IBKR's id is kept in ibkr_cash_events; ledger txn ids are ours
      await post(c, t.cents < 0 ? transfer(txn, account, "ibkr_cash", counter, -t.cents)
                                : transfer(txn, account, counter, "ibkr_cash", t.cents), now);
    }
    const { rows: cash } = await c.query(
      `SELECT a.ibkr_account, SUM(l.cents)::bigint AS cents FROM ledger_entries l JOIN accounts a ON a.id = l.account_id
       WHERE l.bucket = 'ibkr_cash' AND a.ibkr_account IS NOT NULL GROUP BY 1`);
    const { rows: pos } = await c.query(
      `SELECT a.ibkr_account, p.isin, SUM(p.qty)::float8 AS qty FROM position_events p JOIN accounts a ON a.id = p.account_id GROUP BY 1, 2`);
    const ours: Row[] = [...cash.map((r) => ({ account: r.ibkr_account, key: "cash:USD", qty: Number(r.cents) })),
      ...pos.map((r) => ({ account: r.ibkr_account, key: `pos:${r.isin}`, qty: Number(r.qty) }))];
    const breaks = reconcile(ours, positions);
    const open = new Set(breaks.map((b) => `${b.account}|${b.key}`));
    for (const b of breaks)
      await c.query(`INSERT INTO recon_breaks (account_ref, key, ours, ibkr, first_seen) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (account_ref, key) WHERE resolved_at IS NULL DO UPDATE SET ours = EXCLUDED.ours, ibkr = EXCLUDED.ibkr`,
        [b.account, b.key, b.ours, b.ibkr, now]);
    const { rows: prev } = await c.query("SELECT id, account_ref, key, first_seen FROM recon_breaks WHERE resolved_at IS NULL");
    const firstSeen = new Map<string, Date>();
    for (const p of prev) {
      const k = `${p.account_ref}|${p.key}`;
      if (open.has(k)) firstSeen.set(k, p.first_seen);
      else await c.query("UPDATE recon_breaks SET resolved_at = $2 WHERE id = $1", [p.id, now]);
    }
    return { breaks, overdue: overdue(breaks, firstSeen, now) };
  });
}

// Operations resolves a cash break IBKR shows but we did not originate (e.g. a client wired IBKR directly).
// Four-eyes: the person recording it cannot approve it (stress test 3.8).
export async function acknowledgeUnexpectedCash(db: Db, a: { ibkrTxnId: string; accountId: string; cents: number;
  recordedBy: string; approvedBy: string; now: Date }): Promise<void> {
  if (!a.recordedBy || !a.approvedBy || a.recordedBy === a.approvedBy) throw new Error("four_eyes_required");
  if (!Number.isInteger(a.cents) || a.cents === 0) throw new Error("bad_amount");
  await withTx(db, async (c) => {
    const ins = await c.query("INSERT INTO ibkr_cash_events (ibkr_txn_id, account_id, kind, cents) VALUES ($1,$2,'other',$3) ON CONFLICT DO NOTHING",
      [a.ibkrTxnId, a.accountId, a.cents]);
    if (!ins.rowCount) throw new Error("already_recorded");
    const txn = randomUUID();
    await post(c, a.cents > 0 ? transfer(txn, a.accountId, "unidentified", "ibkr_cash", a.cents)
                              : transfer(txn, a.accountId, "ibkr_cash", "unidentified", -a.cents), a.now);
    await c.query("INSERT INTO ops_approvals (subject, recorded_by, approved_by, at) VALUES ($1,$2,$3,$4)",
      [`cash:${a.ibkrTxnId}`, a.recordedBy, a.approvedBy, a.now]);
  });
}
