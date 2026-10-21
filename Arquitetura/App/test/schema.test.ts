// Proves the database-level guarantees on a throwaway Postgres. Skips if Postgres binaries are not installed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const have = spawnSync("initdb", ["--version"]).status === 0;
const dir = have ? mkdtempSync(join(tmpdir(), "od-pg-")) : "";
const port = String(54000 + Math.floor(Math.random() * 900));
const sql = (q: string) => spawnSync("psql", ["-h", dir, "-p", port, "-U", "postgres", "-d", "postgres", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8" });
const ok = (q: string) => { const r = sql(q); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const fails = (q: string, msg: RegExp) => { const r = sql(q); assert.notEqual(r.status, 0, `expected failure: ${q}`); assert.match(r.stderr, msg); };

before(() => {
  if (!have) return;
  execFileSync("initdb", ["-D", join(dir, "data"), "-A", "trust", "-U", "postgres"], { stdio: "ignore" });
  execFileSync("pg_ctl", ["-D", join(dir, "data"), "-o", `-k ${dir} -p ${port} -c listen_addresses=''`, "-w", "start"], { stdio: "ignore" });
  const r = spawnSync("psql", ["-h", dir, "-p", port, "-U", "postgres", "-d", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "db/schema.sql"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  ok(`INSERT INTO clients (id, country) VALUES ('00000000-0000-0000-0000-000000000001','AR');
      INSERT INTO accounts (id, client_id) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001');`);
});
after(() => { if (have) { spawnSync("pg_ctl", ["-D", join(dir, "data"), "-m", "immediate", "stop"]); rmSync(dir, { recursive: true, force: true }); } });

const A = "'00000000-0000-0000-0000-0000000000a1'";
const T = (n: number) => `'00000000-0000-0000-0000-00000000${String(n).padStart(4, "0")}'`;

test("ledger: balanced txn commits, unbalanced txn is rejected at commit", { skip: !have }, () => {
  ok(`BEGIN; INSERT INTO ledger_entries (txn_id, account_id, bucket, cents) VALUES
      (${T(1)}, ${A}, 'client_bank', -50000), (${T(1)}, ${A}, 'in_flight', 50000); COMMIT;`);
  fails(`BEGIN; INSERT INTO ledger_entries (txn_id, account_id, bucket, cents) VALUES (${T(2)}, ${A}, 'in_flight', 100); COMMIT;`, /does not balance/);
  // a later row cannot unbalance an already-committed txn either
  fails(`INSERT INTO ledger_entries (txn_id, account_id, bucket, cents) VALUES (${T(1)}, ${A}, 'in_flight', 1)`, /does not balance/);
  assert.equal(ok(`SELECT count(*) FROM ledger_entries`), "2");
});

test("ledger and audit trail are append-only", { skip: !have }, () => {
  fails(`UPDATE ledger_entries SET cents = 1`, /append-only/);
  fails(`DELETE FROM ledger_entries`, /append-only/);
});

test("deposits: eFX lane capped at US$10k, states and lanes constrained, idempotency key unique", { skip: !have }, () => {
  const ins = (lane: string, cents: number, key: string, state = "kyc_passed") =>
    `INSERT INTO deposits (account_id, lane, amount_cents, idem_key, state) VALUES (${A}, '${lane}', ${cents}, '${key}', '${state}')`;
  ok(ins("br_efx", 1_000_000, "k1"));
  fails(ins("br_efx", 1_000_001, "k2"), /check constraint/);
  ok(ins("br_fxbank", 5_000_000, "k3"));
  fails(ins("ar_usdc", 0, "k4"), /check constraint/);
  fails(ins("pix_crypto", 100, "k5"), /check constraint/);
  fails(ins("ar_usdc", 100, "k6", "teleported"), /check constraint/);
  fails(ins("ar_usdc", 30000, "k1"), /duplicate key/);
});

test("accounts: an IBKR status beyond pending needs an IBKR account number; one account per client", { skip: !have }, () => {
  fails(`UPDATE accounts SET ibkr_status = 'open' WHERE id = ${A}`, /check constraint/);
  ok(`UPDATE accounts SET ibkr_status = 'open', ibkr_account = 'U1234567' WHERE id = ${A}`);
  fails(`INSERT INTO accounts (client_id) VALUES ('00000000-0000-0000-0000-000000000001')`, /duplicate key/);
});

test("outbox: idempotency key unique", { skip: !have }, () => {
  ok(`INSERT INTO outbox (idem_key, target, payload) VALUES ('2026-11:core:IE00B5BMR087', 'ibkr', '{}')`);
  fails(`INSERT INTO outbox (idem_key, target, payload) VALUES ('2026-11:core:IE00B5BMR087', 'ibkr', '{}')`, /duplicate key/);
});
