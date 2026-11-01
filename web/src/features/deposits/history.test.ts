import { describe, expect, it } from "vitest";
import { depositStates } from "@/api/schemas";
import { historyFilters, inProgressStates, isInProgress, newestFirst, statesFor } from "./history";

describe("history filters (T10)", () => {
  it("only ever asks for finished deposits", () => {
    expect(historyFilters).toEqual(["all", "invested", "returned"]);
    expect(statesFor("all")).toEqual(["invested", "returned"]);
    expect(statesFor("invested")).toEqual(["invested"]);
    expect(statesFor("returned")).toEqual(["returned"]);
  });

  it("in progress is every deposit state that is not finished, without the account steps", () => {
    expect(inProgressStates).toEqual([
      "deposit_notified",
      "partner_collected",
      "fx_executed",
      "wire_sent",
      "broker_credited",
    ]);
  });

  it("splits every deposit state into exactly one of the two sections", () => {
    const deposits = depositStates.filter((s) => s !== "kyc_passed" && s !== "ibkr_open");
    for (const state of deposits) {
      const inHistory = statesFor("all").includes(state);
      expect(inHistory).not.toBe(inProgressStates.includes(state));
      expect(isInProgress({ state })).toBe(!inHistory);
    }
  });
});

describe("newestFirst", () => {
  const item = (id: string, createdAt: string) => ({ id, createdAt });

  it("sorts by createdAt, most recent first", () => {
    const sorted = newestFirst([
      item("a", "2026-08-01T10:00:00Z"),
      item("c", "2026-10-01T10:00:00Z"),
      item("b", "2026-09-01T10:00:00Z"),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(["c", "b", "a"]);
  });

  it("keeps the received order on a tie and does not mutate the input", () => {
    const input = [item("x", "2026-10-01T10:00:00Z"), item("y", "2026-10-01T10:00:00Z")];
    const sorted = newestFirst(input);
    expect(sorted.map((d) => d.id)).toEqual(["x", "y"]);
    expect(sorted).not.toBe(input);
  });

  it("compares instants, not strings, across time-zone offsets", () => {
    const sorted = newestFirst([
      item("utc", "2026-10-01T12:00:00Z"),
      item("later", "2026-10-01T10:00:00-03:00"),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(["later", "utc"]);
  });
});
