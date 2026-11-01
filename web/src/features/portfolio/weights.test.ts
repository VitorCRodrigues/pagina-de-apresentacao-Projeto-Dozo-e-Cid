import { describe, expect, it } from "vitest";
import { weightComparison } from "./weights";

describe("weightComparison", () => {
  it("turns the API ratios into basis points", () => {
    expect(weightComparison(0.6, 0.6)).toEqual({
      currentBp: 6000,
      targetBp: 6000,
      barBp: 6000,
      markerBp: 6000,
    });
  });

  it("rounds half up to the nearest basis point", () => {
    expect(weightComparison(0.58125, 0.6).currentBp).toBe(5813);
  });

  it("keeps the real value in the text but never lets the bar overflow", () => {
    expect(weightComparison(1.02, 1)).toEqual({
      currentBp: 10200,
      targetBp: 10000,
      barBp: 10000,
      markerBp: 10000,
    });
  });

  it("never draws a negative bar", () => {
    const result = weightComparison(-0.01, 0.1);
    expect(result.currentBp).toBe(-100);
    expect(result.barBp).toBe(0);
    expect(result.markerBp).toBe(1000);
  });

  it("reads a missing or broken ratio as zero", () => {
    expect(weightComparison(Number.NaN, 0.3)).toEqual({
      currentBp: 0,
      targetBp: 3000,
      barBp: 0,
      markerBp: 3000,
    });
    expect(weightComparison(0.2, Number.POSITIVE_INFINITY).markerBp).toBe(0);
  });
});
