import type { Portfolio } from "@/api/types";
import { sumCents } from "@/lib/money";

export type Bucket = "invested" | "ibkrCash" | "inFlight";

// Display order, and the tie-break order when two remainders are equal.
export const buckets: readonly Bucket[] = ["invested", "ibkrCash", "inFlight"];

// Each bucket's amount, keyed like `buckets`.
export const centsOf = (b: Portfolio["buckets"]): Record<Bucket, number> => ({
  invested: b.investedCents,
  ibkrCash: b.ibkrCashCents,
  inFlight: b.inFlightCents,
});

// decisions.md, item 15: invested + cash + in flight. Fees paid never enter the total.
export function bucketsTotalCents(b: Portfolio["buckets"]): number {
  return sumCents(buckets.map((bucket) => centsOf(b)[bucket]));
}

const FULL = 10000;

// Each bucket's share of the total in integer basis points, by largest remainder, so the
// shares on screen always add up to exactly 100%. An empty portfolio is all zero.
export function bucketShares(b: Portfolio["buckets"]): Record<Bucket, number> {
  const cents = centsOf(b);
  const total = bucketsTotalCents(b);
  const shares: Record<Bucket, number> = { invested: 0, ibkrCash: 0, inFlight: 0 };
  if (total <= 0) return shares;

  for (const bucket of buckets) shares[bucket] = Math.floor((cents[bucket] * FULL) / total);
  let left = FULL - buckets.reduce((sum, bucket) => sum + shares[bucket], 0);
  const byRemainder = [...buckets].sort(
    (a, c) => ((cents[c] * FULL) % total) - ((cents[a] * FULL) % total),
  );
  for (const bucket of byRemainder) {
    if (left === 0) break;
    shares[bucket] += 1;
    left -= 1;
  }
  return shares;
}
