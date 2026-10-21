// Double-entry cash ledger in USD cents. Positions are not here: they are share quantities, reconciled separately.
// Buckets: client_bank -> in_flight (partner leg) -> ibkr_cash -> invested; fees go to fees:<name>.
export type Entry = { txnId: string; account: string; bucket: string; cents: number };

export function transfer(txnId: string, account: string, from: string, to: string, cents: number): Entry[] {
  if (!Number.isInteger(cents) || cents <= 0) throw new Error("bad_amount");
  if (from === to) throw new Error("same_bucket");
  return [{ txnId, account, bucket: from, cents: -cents }, { txnId, account, bucket: to, cents }];
}

// Rejects any batch whose transactions do not each sum to zero. The DB enforces the same rule (schema.sql).
export function assertBalanced(entries: Entry[]): void {
  const sums = new Map<string, number>();
  for (const e of entries) {
    if (!Number.isInteger(e.cents)) throw new Error(`non_integer:${e.txnId}`);
    sums.set(e.txnId, (sums.get(e.txnId) ?? 0) + e.cents);
  }
  for (const [txn, s] of sums) if (s !== 0) throw new Error(`unbalanced:${txn}`);
}

export function balances(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(`${e.account}|${e.bucket}`, (m.get(`${e.account}|${e.bucket}`) ?? 0) + e.cents);
  return m;
}
