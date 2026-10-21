// IBKR is the book of record. Anything that differs from our mirror is a break and opens an operations case.
export type Row = { account: string; key: string; qty: number }; // key: 'cash:USD' or 'pos:<ISIN>'; cash in cents
export type Break = { account: string; key: string; ours: number; ibkr: number };

export function reconcile(ours: Row[], ibkr: Row[]): Break[] {
  const sum = (rows: Row[]) => rows.reduce((m, r) => m.set(`${r.account}|${r.key}`, (m.get(`${r.account}|${r.key}`) ?? 0) + r.qty), new Map<string, number>());
  const a = sum(ours), b = sum(ibkr), out: Break[] = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const o = a.get(k) ?? 0, i = b.get(k) ?? 0;
    if (Math.abs(o - i) > 1e-6) { const [account, key] = k.split("|"); out.push({ account, key, ours: o, ibkr: i }); }
  }
  return out;
}

// Business days between two dates (Mon-Fri; ponytail: no exchange holidays, add a calendar when ops needs it).
export function businessDaysBetween(from: Date, to: Date): number {
  let n = 0;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (d.getTime() < end) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

// Breaks still open after more than one business day must alert (stress test 3.7).
export function overdue(breaks: Break[], firstSeen: Map<string, Date>, now: Date): Break[] {
  return breaks.filter((b) => { const s = firstSeen.get(`${b.account}|${b.key}`); return s && businessDaysBetween(s, now) > 1; });
}

// Minimal Flex XML reader for the two sections recon needs. Flex emits flat, self-closing, attribute-only rows.
const unescape = (v: string) => v.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function rows(xml: string, tag: string): Record<string, string>[] {
  return [...xml.matchAll(new RegExp(`<${tag}\\s([^>]*?)/?>`, "g"))].map((m) =>
    Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, unescape(v)])));
}
const toCents = (s: string) => { const n = Number(s); if (!Number.isFinite(n)) throw new Error(`bad_number:${s}`); return Math.round(n * 100); };

export function parseFlex(xml: string): Row[] {
  if (!/<FlexQueryResponse/.test(xml)) throw new Error("not_flex_response");
  const out: Row[] = [];
  for (const r of rows(xml, "OpenPosition")) {
    if (r.levelOfDetail && r.levelOfDetail !== "SUMMARY") continue; // lots would double count
    const qty = Number(r.position);
    if (!r.accountId || !r.isin || !Number.isFinite(qty)) throw new Error("bad_position_row");
    out.push({ account: r.accountId, key: `pos:${r.isin}`, qty });
  }
  for (const r of rows(xml, "CashReportCurrency")) {
    if (r.currency === "BASE_SUMMARY") continue; // IBKR's base-currency total row repeats the per-currency rows
    if (!r.accountId || !r.currency || r.endingCash === undefined) throw new Error("bad_cash_row");
    out.push({ account: r.accountId, key: `cash:${r.currency}`, qty: toCents(r.endingCash) });
  }
  return out;
}

// Cash movements IBKR originated or saw that we did not (portal withdrawals, interest, fees). Positive
// Deposits/Withdrawals rows are skipped: our own deposits arrive through the funding flow, and a deposit
// we did not expect must surface as a reconciliation break, not be silently imported.
export type CashTxn = { id: string; account: string; kind: "withdrawal" | "interest" | "fee"; cents: number };
export function parseCashTransactions(xml: string): CashTxn[] {
  if (!/<FlexQueryResponse/.test(xml)) throw new Error("not_flex_response");
  const out: CashTxn[] = [];
  for (const r of rows(xml, "CashTransaction")) {
    if (r.levelOfDetail && r.levelOfDetail !== "DETAIL") continue;
    if (r.currency !== "USD") throw new Error(`unexpected_currency:${r.currency}`); // pilot holds USD only
    if (!r.transactionID || !r.accountId) throw new Error("bad_cash_txn_row");
    const cents = toCents(r.amount);
    const kind = r.type === "Deposits/Withdrawals" ? (cents < 0 ? "withdrawal" : null)
      : /Interest/i.test(r.type) ? "interest" : /Fee|Commission/i.test(r.type) ? "fee" : null;
    if (kind && cents !== 0) out.push({ id: r.transactionID, account: r.accountId, kind, cents });
  }
  return out;
}
