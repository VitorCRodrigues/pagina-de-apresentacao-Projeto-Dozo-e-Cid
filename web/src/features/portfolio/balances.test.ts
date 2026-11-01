import { describe, expect, it } from "vitest";
import type { Portfolio } from "@/api/types";
import { bucketShares, bucketsTotalCents } from "./balances";

const buckets = (
  investedCents: number,
  ibkrCashCents: number,
  inFlightCents: number,
  feesPaidCents = 0,
): Portfolio["buckets"] => ({ investedCents, ibkrCashCents, inFlightCents, feesPaidCents });

describe("bucketsTotalCents", () => {
  it("adds invested, cash and in flight, and leaves fees out (decision 15)", () => {
    expect(bucketsTotalCents(buckets(120000, 31200, 50000, 450))).toBe(201200);
  });

  it("stays exact on large amounts", () => {
    expect(bucketsTotalCents(buckets(90_000_000_001, 1, 3))).toBe(90_000_000_005);
  });

  it("rejects anything that is not integer cents", () => {
    expect(() => bucketsTotalCents(buckets(100, 0, 0.5))).toThrow(TypeError);
  });
});

describe("bucketShares", () => {
  it("splits equal buckets into basis points that add up to exactly 100%", () => {
    expect(bucketShares(buckets(1, 1, 1))).toEqual({
      invested: 3334,
      ibkrCash: 3333,
      inFlight: 3333,
    });
  });

  it("gives everything to the only bucket with money", () => {
    expect(bucketShares(buckets(0, 0, 50000))).toEqual({
      invested: 0,
      ibkrCash: 0,
      inFlight: 10000,
    });
  });

  it("is all zero for an empty portfolio, without dividing by zero", () => {
    expect(bucketShares(buckets(0, 0, 0))).toEqual({ invested: 0, ibkrCash: 0, inFlight: 0 });
  });

  it("ignores fees", () => {
    expect(bucketShares(buckets(7500, 2500, 0, 9999))).toEqual({
      invested: 7500,
      ibkrCash: 2500,
      inFlight: 0,
    });
  });

  it("hands the leftover point to the largest remainder", () => {
    // 2/3 = 6666.67, 1/3 = 3333.33: the larger remainder gets the extra point.
    expect(bucketShares(buckets(2, 1, 0))).toEqual({ invested: 6667, ibkrCash: 3333, inFlight: 0 });
  });

  it("never gives a negative bucket a share: it counts as zero (cash owed for a fee)", () => {
    expect(bucketShares(buckets(100000, -500, 0))).toEqual({
      invested: 10000,
      ibkrCash: 0,
      inFlight: 0,
    });
    expect(bucketShares(buckets(0, -500, 0))).toEqual({ invested: 0, ibkrCash: 0, inFlight: 0 });
  });

  it("still adds the negative bucket to the total", () => {
    expect(bucketsTotalCents(buckets(100000, -500, 0))).toBe(99500);
  });

  it("adds up to 10000 with negative buckets too, whenever one bucket is positive", () => {
    let seed = 11;
    const next = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed % 5_000_000) - 1_000_000;
    };
    for (let i = 0; i < 200; i++) {
      const shares = bucketShares(buckets(next(), next(), Math.abs(next()) + 1));
      expect(Math.min(shares.invested, shares.ibkrCash, shares.inFlight)).toBeGreaterThanOrEqual(0);
      expect(shares.invested + shares.ibkrCash + shares.inFlight).toBe(10000);
    }
  });

  it("always adds up to 10000 when there is money", () => {
    let seed = 7;
    const next = () => {
      seed = (seed * 48271) % 2147483647;
      return seed % 5_000_000;
    };
    for (let i = 0; i < 200; i++) {
      const shares = bucketShares(buckets(next(), next(), next() + 1));
      expect(shares.invested + shares.ibkrCash + shares.inFlight).toBe(10000);
    }
  });
});
