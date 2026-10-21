// Fake IBKR and partner. The fake IBKR keeps its OWN book and emits real Flex XML, so reconciliation compares two
// independently maintained ledgers, as it will against the paper account.
import type { AllocationOrder, CollectionInstruction, DepositNotice, IbkrGateway, PartnerGateway } from "../../src/gateways.ts";

export class FakeIbkr implements IbkrGateway {
  calls: { kind: string; idemKey: string }[] = [];
  notices = new Map<string, DepositNotice>();
  orders = new Map<string, AllocationOrder>();
  cash = new Map<string, number>();                 // ibkrAccount -> cents
  pos = new Map<string, Map<string, number>>();     // ibkrAccount -> isin -> shares
  cashTxns: { id: string; account: string; type: string; cents: number }[] = [];
  failNext = 0;

  async notifyDeposit(n: DepositNotice, idemKey: string) {
    this.calls.push({ kind: "notify", idemKey });
    if (this.failNext > 0) { this.failNext--; throw new Error("ibkr_503"); }
    this.notices.set(idemKey, n); // keyed by idemKey: a retry is a no-op, like the real API must be
  }
  async placeAllocationOrder(o: AllocationOrder, idemKey: string) {
    this.calls.push({ kind: "order", idemKey });
    if (this.failNext > 0) { this.failNext--; throw new Error("ibkr_503"); }
    this.orders.set(idemKey, o);
  }
  // IBKR-side events
  credit(account: string, cents: number, id: string) {
    this.cash.set(account, (this.cash.get(account) ?? 0) + cents);
    this.cashTxns.push({ id, account, type: "Deposits/Withdrawals", cents });
  }
  withdraw(account: string, cents: number, id: string) { this.credit(account, -cents, id); }
  interest(account: string, cents: number, id: string) {
    this.cash.set(account, (this.cash.get(account) ?? 0) + cents);
    this.cashTxns.push({ id, account, type: "Broker Interest Received", cents });
  }
  // Fills every account of an order at one price; returns fills per IBKR account.
  fill(idemKey: string, priceCents: number) {
    const o = this.orders.get(idemKey); if (!o) throw new Error("no such order");
    const out: Record<string, { shares: number; cents: number }> = {};
    for (const [acct, a] of Object.entries(o.allocations)) {
      const shares = a.shares ?? Math.floor((a.cents / priceCents) * 1e4) / 1e4; // fractional to 4dp
      const cents = Math.round(shares * priceCents);
      this.cash.set(acct, (this.cash.get(acct) ?? 0) - cents);
      const m = this.pos.get(acct) ?? new Map(); m.set(o.isin, (m.get(o.isin) ?? 0) + shares); this.pos.set(acct, m);
      out[acct] = { shares, cents };
    }
    return out;
  }
  statement(): string {
    const p = [...this.pos].flatMap(([a, m]) => [...m].map(([isin, q]) =>
      `<OpenPosition accountId="${a}" isin="${isin}" position="${q}" levelOfDetail="SUMMARY" />`));
    const c = [...this.cash].map(([a, cents]) => `<CashReportCurrency accountId="${a}" currency="USD" endingCash="${(cents / 100).toFixed(2)}" />`);
    const t = this.cashTxns.map((x) => `<CashTransaction accountId="${x.account}" currency="USD" amount="${(x.cents / 100).toFixed(2)}" type="${x.type}" transactionID="${x.id}" levelOfDetail="DETAIL" />`);
    return `<FlexQueryResponse><FlexStatements><FlexStatement><OpenPositions>${p.join("")}</OpenPositions><CashReport>${c.join("")}</CashReport><CashTransactions>${t.join("")}</CashTransactions></FlexStatement></FlexStatements></FlexQueryResponse>`;
  }
}

export class FakePartner implements PartnerGateway {
  instructions = new Map<string, CollectionInstruction>();
  async instructCollection(i: CollectionInstruction, idemKey: string) { this.instructions.set(idemKey, i); }
}
