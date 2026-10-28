import { describe, expect, it } from "vitest";
import { isAtLeastAge } from "./age";

const today = new Date(2026, 9, 27); // 27 Oct 2026, local time

describe("isAtLeastAge", () => {
  it("counts the 18th birthday itself as old enough", () => {
    expect(isAtLeastAge("2008-10-27", 18, today)).toBe(true);
    expect(isAtLeastAge("2008-10-28", 18, today)).toBe(false);
  });

  it("defaults to 18 years", () => {
    expect(isAtLeastAge("2008-10-27", undefined, today)).toBe(true);
  });

  it("treats a 29 February birthday as 1 March in common years", () => {
    expect(isAtLeastAge("2008-02-29", 18, new Date(2026, 1, 28))).toBe(false);
    expect(isAtLeastAge("2008-02-29", 18, new Date(2026, 2, 1))).toBe(true);
  });

  it("rejects future and impossible dates", () => {
    expect(isAtLeastAge("2030-01-01", 18, today)).toBe(false);
    expect(isAtLeastAge("2008-13-01", 18, today)).toBe(false);
    expect(isAtLeastAge("2007-02-30", 18, today)).toBe(false);
    expect(isAtLeastAge("27/10/2008", 18, today)).toBe(false);
  });
});
