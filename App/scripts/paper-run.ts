// Pilot smoke test against the IBKR PAPER account. Read-only at IBKR: pulls a Flex statement, parses it, and
// (if DATABASE_URL is set) imports it and reconciles against our ledger.
//   IBKR_FLEX_TOKEN=... IBKR_FLEX_QUERY_ID=... [DATABASE_URL=postgres://...] npm run paper
// Optional order test, paper only: PAPER_ORDER=1 IBKR_WEB_API_URL=https://localhost:5000/v1/api PAPER_CONID=<conid>
//   PAPER_ISIN=<isin> PAPER_ACCOUNTS=DU111,DU222  -> one 1-share-per-account allocation order through the gateway.
// The Flex query must include Open Positions (summary), Cash Report and Cash Transactions (detail), in USD.
import pg from "pg";
import { fetchFlexStatement } from "../src/ibkr.ts";
import { parseCashTransactions, parseFlex } from "../src/recon.ts";
import { importAndReconcile } from "../src/db.ts";
import { webApiIbkrGateway } from "../src/ibkr.ts";

const queryId = process.env.IBKR_FLEX_QUERY_ID;
if (!process.env.IBKR_FLEX_TOKEN || !queryId) {
  console.error("Set IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID for the paper account.");
  process.exit(2);
}
const xml = await fetchFlexStatement(queryId);
const rows = parseFlex(xml), cash = parseCashTransactions(xml);
console.log(`Flex OK: ${rows.length} position/cash rows, ${cash.length} cash transactions`);
for (const r of rows) console.log(`  ${r.account}  ${r.key.padEnd(20)} ${r.key.startsWith("cash:") ? (r.qty / 100).toFixed(2) : r.qty}`);
if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await importAndReconcile(pool, xml, new Date());
    console.log(r.breaks.length ? `BREAKS (${r.breaks.length}):` : "Reconciliation: zero breaks");
    for (const b of r.breaks) console.log(`  ${b.account} ${b.key} ours=${b.ours} ibkr=${b.ibkr}`);
    process.exitCode = r.breaks.length ? 1 : 0;
  } finally { await pool.end(); }
}

if (process.env.PAPER_ORDER === "1") {
  const accounts = (process.env.PAPER_ACCOUNTS ?? "").split(",").filter(Boolean);
  const isin = process.env.PAPER_ISIN, conid = Number(process.env.PAPER_CONID);
  // Safety: paper accounts start with DU (e.g. DU1234567, DUN129166). Refuse anything else.
  if (!accounts.length || accounts.some((a) => !/^DU[A-Z]?\d+$/.test(a)) || !isin || !conid) {
    console.error("PAPER_ORDER needs PAPER_ACCOUNTS (DU… paper accounts only), PAPER_ISIN and PAPER_CONID.");
    process.exit(2);
  }
  const key = `paper-${new Date().toISOString().slice(0, 16)}:${isin}`;
  await webApiIbkrGateway({ conids: { [isin]: conid } }).placeAllocationOrder(
    { windowId: "paper", isin, allocations: Object.fromEntries(accounts.map((a) => [a, { cents: 0, shares: 1 }])) }, key);
  console.log(`Paper order accepted (cOID ${key}). Check it in the paper account, then rerun this script for recon.`);
}
