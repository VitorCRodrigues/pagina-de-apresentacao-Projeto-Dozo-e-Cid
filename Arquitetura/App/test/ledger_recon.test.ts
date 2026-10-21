import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBalanced, balances, transfer } from "../src/ledger.ts";
import { businessDaysBetween, overdue, parseFlex, reconcile } from "../src/recon.ts";

test("ledger: transfers balance; bad amounts rejected", () => {
  const e = [...transfer("t1", "A", "client_bank", "in_flight", 500_00), ...transfer("t2", "A", "in_flight", "ibkr_cash", 500_00)];
  assert.doesNotThrow(() => assertBalanced(e));
  assert.equal(balances(e).get("A|ibkr_cash"), 500_00);
  assert.equal(balances(e).get("A|in_flight"), 0);
  for (const c of [0, -1, 1.5]) assert.throws(() => transfer("t", "A", "x", "y", c), /bad_amount/);
  assert.throws(() => transfer("t", "A", "x", "x", 1), /same_bucket/);
  assert.throws(() => assertBalanced([{ txnId: "t3", account: "A", bucket: "x", cents: 5 }]), /unbalanced:t3/);
});

test("recon: matching books, missing rows on either side, and quantity diffs", () => {
  const ours = [{ account: "U1", key: "cash:USD", qty: 100_00 }, { account: "U1", key: "pos:IE00B5BMR087", qty: 2 }];
  assert.deepEqual(reconcile(ours, ours), []);
  assert.deepEqual(reconcile(ours, [ours[0]]), [{ account: "U1", key: "pos:IE00B5BMR087", ours: 2, ibkr: 0 }]);
  assert.deepEqual(reconcile([ours[0]], ours), [{ account: "U1", key: "pos:IE00B5BMR087", ours: 0, ibkr: 2 }]);
  assert.equal(reconcile(ours, [{ ...ours[0], qty: 99_99 }, ours[1]]).length, 1);
  assert.deepEqual(reconcile([{ account: "U1", key: "pos:X", qty: 0.1 + 0.2 }], [{ account: "U1", key: "pos:X", qty: 0.3 }]), []);
});

test("business days skip weekends; breaks alert after more than one", () => {
  const fri = new Date("2026-10-16T20:00:00Z"), mon = new Date("2026-10-19T09:00:00Z"), tue = new Date("2026-10-20T09:00:00Z");
  assert.equal(businessDaysBetween(fri, mon), 1);
  assert.equal(businessDaysBetween(fri, tue), 2);
  assert.equal(businessDaysBetween(mon, mon), 0);
  const b = [{ account: "U1", key: "cash:USD", ours: 1, ibkr: 2 }];
  const seen = new Map([["U1|cash:USD", fri]]);
  assert.deepEqual(overdue(b, seen, mon), []);
  assert.deepEqual(overdue(b, seen, tue), b);
});

const flex = `<FlexQueryResponse queryName="recon" type="AF"><FlexStatements count="1"><FlexStatement accountId="U1">
<OpenPositions>
<OpenPosition accountId="U1" isin="IE00B5BMR087" position="3.5" levelOfDetail="SUMMARY" description="ISHARES CORE S&amp;P 500" />
<OpenPosition accountId="U1" isin="IE00B5BMR087" position="3.5" levelOfDetail="LOT" />
</OpenPositions>
<CashReport>
<CashReportCurrency accountId="U1" currency="BASE_SUMMARY" endingCash="120.10" />
<CashReportCurrency accountId="U1" currency="USD" endingCash="120.10" />
</CashReport></FlexStatement></FlexStatements></FlexQueryResponse>`;

test("flex parser: summary rows only, cents, XML entities, bad input rejected", () => {
  assert.deepEqual(parseFlex(flex), [
    { account: "U1", key: "pos:IE00B5BMR087", qty: 3.5 },
    { account: "U1", key: "cash:USD", qty: 120_10 },
  ]);
  assert.throws(() => parseFlex("<html>error</html>"), /not_flex_response/);
  assert.throws(() => parseFlex(`<FlexQueryResponse><CashReportCurrency accountId="U1" currency="USD" endingCash="abc" /></FlexQueryResponse>`), /bad_number/);
  assert.throws(() => parseFlex(`<FlexQueryResponse><OpenPosition accountId="U1" position="1" /></FlexQueryResponse>`), /bad_position_row/);
});

test("end to end: deposit -> invest -> recon against a Flex statement shows zero breaks", () => {
  const e = [...transfer("d1", "U1", "client_bank", "in_flight", 500_00), ...transfer("d2", "U1", "in_flight", "ibkr_cash", 500_00),
    ...transfer("o1", "U1", "ibkr_cash", "invested", 379_90)];
  assertBalanced(e);
  const ours = [{ account: "U1", key: "cash:USD", qty: balances(e).get("U1|ibkr_cash")! }, { account: "U1", key: "pos:IE00B5BMR087", qty: 3.5 }];
  assert.deepEqual(reconcile(ours, parseFlex(flex)), []);
});
