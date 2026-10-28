import { describe, expect, it } from "vitest";
import {
  applyBasisPoints,
  centsToDecimalString,
  formatMoney,
  formatPercent,
  parseAmountToCents,
  sumCents,
} from "./money";

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

  it("formats the smallest amounts exactly", () => {
    expect(formatMoney(1, "es")).toBe("US$ 0,01");
    expect(formatMoney(-1, "en")).toBe("-$0.01");
    expect(formatMoney(99, "pt")).toBe("US$ 0,99");
    expect(formatMoney(100, "en")).toBe("$1.00");
  });

  it("applies basis points with integer rounding", () => {
    expect(applyBasisPoints(50000, 30)).toBe(150); // 0.30% of US$500
    expect(applyBasisPoints(16667, 30)).toBe(50); // 50.001 -> 50
    expect(applyBasisPoints(16684, 30)).toBe(50); // 50.052 -> 50
    expect(applyBasisPoints(16834, 30)).toBe(51); // 50.502 -> 51
    expect(() => applyBasisPoints(10.5, 30)).toThrow(TypeError);
  });

  it("parses typed amounts per locale into cents", () => {
    expect(parseAmountToCents("250", "es")).toBe(25000);
    expect(parseAmountToCents("1.234,5", "es")).toBe(123450);
    expect(parseAmountToCents("1,234.50", "en")).toBe(123450);
    expect(parseAmountToCents("US$ 0,01", "pt")).toBe(1);
    expect(parseAmountToCents(" 250,00 ", "es")).toBe(25000);
  });

  it.each([
    ["1.234,5", "en"],
    ["0,001", "es"],
    ["-10", "es"],
    ["", "es"],
    ["abc", "en"],
    ["1,2,3", "en"],
    ["99999999999999999", "es"],
  ] as const)("rejects %s in %s", (input, locale) => {
    expect(parseAmountToCents(input, locale)).toBeNull();
  });

  it("formats display-only ratios as percentages", () => {
    expect(formatPercent(0.011, "es")).toBe("1,1%");
    expect(formatPercent(0.003, "en")).toBe("0.3%");
  });
});
