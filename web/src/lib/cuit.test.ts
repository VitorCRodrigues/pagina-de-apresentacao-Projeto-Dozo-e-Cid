import { describe, expect, it } from "vitest";
import { formatCuit, isValidCuit, normalizeCuit } from "./cuit";

describe("CUIT/CUIL", () => {
  it("accepts a valid number with or without separators", () => {
    expect(isValidCuit("20-12345678-6")).toBe(true);
    expect(isValidCuit("20123456786")).toBe(true);
    expect(isValidCuit("20 12345678 6")).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidCuit("20123456780")).toBe(false);
  });

  it("rejects company prefixes: the pilot opens accounts for individuals only", () => {
    expect(isValidCuit("30123456781")).toBe(false);
  });

  it("rejects the wrong length and stray characters", () => {
    expect(isValidCuit("2012345678")).toBe(false);
    expect(isValidCuit("201234567861")).toBe(false);
    expect(isValidCuit("20-1234567a-6")).toBe(false);
    expect(isValidCuit("")).toBe(false);
  });

  it("rejects a remainder that gives check digit 10", () => {
    // 20-00000001-?: the weighted sum is 12, remainder 1, so no single digit is valid.
    for (let digit = 0; digit <= 9; digit++) {
      expect(isValidCuit(`2000000001${String(digit)}`)).toBe(false);
    }
  });

  it("normalizes and formats", () => {
    expect(normalizeCuit(" 20-12345678-6 ")).toBe("20123456786");
    expect(formatCuit("20123456786")).toBe("20-12345678-6");
  });
});
