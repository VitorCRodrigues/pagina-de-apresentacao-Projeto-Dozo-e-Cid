import { describe, expect, it } from "vitest";
import {
  formatWindowDate,
  nextInvestmentWindow,
  resolveInvestmentWindow,
} from "./investment-window";

const day = (iso: string) => `${iso}T00:00:00.000Z`;

describe("nextInvestmentWindow (local fallback)", () => {
  it("is this month's window while the day has not passed", () => {
    expect(nextInvestmentWindow(new Date("2026-10-03T15:00:00Z"), 5)).toBe(day("2026-10-05"));
  });

  it("is today on the window day itself", () => {
    expect(nextInvestmentWindow(new Date("2026-10-05T23:59:00Z"), 5)).toBe(day("2026-10-05"));
  });

  it("moves to next month once the day has passed, across the year end", () => {
    expect(nextInvestmentWindow(new Date("2026-10-06T00:00:00Z"), 5)).toBe(day("2026-11-05"));
    expect(nextInvestmentWindow(new Date("2026-12-20T00:00:00Z"), 5)).toBe(day("2027-01-05"));
  });

  it("falls on the last day of a short month", () => {
    expect(nextInvestmentWindow(new Date("2027-02-01T00:00:00Z"), 31)).toBe(day("2027-02-28"));
    expect(nextInvestmentWindow(new Date("2028-02-01T00:00:00Z"), 31)).toBe(day("2028-02-29"));
  });

  it("reads the calendar day in UTC", () => {
    // 31 January 23:30 in Buenos Aires is already 1 February in UTC.
    expect(nextInvestmentWindow(new Date("2026-01-31T23:30:00-03:00"), 31)).toBe(day("2026-02-28"));
  });
});

describe("resolveInvestmentWindow", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  it("prefers the server's date in GET /config", () => {
    expect(
      resolveInvestmentWindow({
        config: { investmentWindowDay: 5, nextInvestmentWindow: "2026-11-06T14:00:00Z" },
        deposits: [{ nextInvestmentWindow: "2026-11-04T14:00:00Z" }],
        now,
      }),
    ).toBe("2026-11-06T14:00:00Z");
  });

  it("then a deposit's date from the server", () => {
    expect(
      resolveInvestmentWindow({
        config: { investmentWindowDay: 5 },
        deposits: [{}, { nextInvestmentWindow: "2026-11-04T14:00:00Z" }],
        now,
      }),
    ).toBe("2026-11-04T14:00:00Z");
  });

  it("and only then the local calculation", () => {
    expect(resolveInvestmentWindow({ config: { investmentWindowDay: 5 }, deposits: [], now })).toBe(
      day("2026-11-05"),
    );
  });
});

describe("formatWindowDate", () => {
  it("reads every window date as a UTC calendar day, wherever the client is", () => {
    // Buenos Aires is UTC-3: a local reading of midnight UTC would say 14 November.
    expect(formatWindowDate("2026-11-15T00:00:00Z", "es")).toBe("15 nov 2026");
    expect(formatWindowDate("2026-11-09T14:00:00Z", "es")).toBe("9 nov 2026");
  });
});
