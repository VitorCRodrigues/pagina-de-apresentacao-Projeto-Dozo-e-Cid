import { describe, expect, it } from "vitest";
import { centsToDecimalString, formatMoney, formatPercent, sumCents } from "./money";

describe("money", () => {
  it("formats USD per locale as in PRD section 9", () => {
    expect(formatMoney(123456, "es")).toBe("US$ 1.234,56");
    expect(formatMoney(123456, "pt")).toBe("US$ 1.234,56");
    expect(formatMoney(123456, "en")).toBe("$1,234.56");
  });

  it("converts cents to a decimal string without division", () => {
    expect(centsToDecimalString(0)).toBe("0.00");
    expect(centsToDecimalString(5)).toBe("0.05");
    expect(centsToDecimalString(-12345)).toBe("-123.45");
    expect(centsToDecimalString(Number.MAX_SAFE_INTEGER)).toBe("90071992547409.91");
  });

  it("sums integers exactly where floats would drift", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumCents([10, 20])).toBe(30);
  });

  it("rejects non-integer amounts", () => {
    expect(() => sumCents([10, 0.5])).toThrow(TypeError);
    expect(() => formatMoney(12.5, "es")).toThrow(TypeError);
  });

  it("formats display-only ratios as percentages", () => {
    expect(formatPercent(0.011, "es")).toBe("1,1%");
    expect(formatPercent(0.003, "en")).toBe("0.3%");
  });
});
