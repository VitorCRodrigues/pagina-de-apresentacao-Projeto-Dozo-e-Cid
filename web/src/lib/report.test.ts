import { afterEach, describe, expect, it, vi } from "vitest";
import { reportIssue } from "./report";

describe("reportIssue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns in development with the event name only", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    reportIssue("portfolio_total_mismatch");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[opendollars] portfolio_total_mismatch");
  });

  it("reports an event once per key, however often a screen mounts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    reportIssue("portfolio_total_mismatch", "2026-10-31T06:00:00Z");
    reportIssue("portfolio_total_mismatch", "2026-10-31T06:00:00Z");
    reportIssue("portfolio_total_mismatch", "2026-11-01T06:00:00Z");
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
