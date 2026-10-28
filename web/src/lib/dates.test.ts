import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime } from "./dates";

const buenosAires = { timeZone: "America/Argentina/Buenos_Aires" };

describe("dates", () => {
  it("shows the calendar day of the client's time zone, not UTC", () => {
    // 02:30 UTC on the 28th is still the evening of the 27th in Buenos Aires.
    expect(formatDate("2026-10-28T02:30:00Z", "es", buenosAires)).toBe("27 oct 2026");
    expect(formatDate("2026-10-28T02:30:00Z", "pt", { timeZone: "America/Sao_Paulo" })).toBe(
      "27 de out. de 2026",
    );
  });

  it("uses a 24-hour clock in es and pt and 12 hours in en", () => {
    expect(formatDateTime("2026-10-27T21:05:00Z", "es", buenosAires)).toBe(
      "27 de oct de 2026, 18:05",
    );
    expect(formatTime("2026-10-27T21:05:00Z", "en", { timeZone: "America/New_York" })).toMatch(
      /^5:05\sPM$/u,
    );
  });
});
