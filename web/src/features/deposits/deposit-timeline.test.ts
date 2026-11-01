import { describe, expect, it } from "vitest";
import type { DepositDetail } from "@/api/proposed-types";
import type { DepositState, Rail } from "@/api/types";
import { depositTimeline, stateLabelKey } from "./deposit-timeline";

const at = (minute: number) => `2026-10-31T12:${String(minute).padStart(2, "0")}:00Z`;

function deposit(rail: Rail, reached: DepositState[], extra: Partial<DepositDetail> = {}) {
  const state = reached.at(-1) ?? "deposit_notified";
  return {
    id: "dep-1",
    rail,
    state,
    amountCents: 50000,
    costs: [],
    history: reached.map((s, i) => ({ state: s, at: at(i) })),
    createdAt: at(0),
    isFirstDeposit: false,
    ...extra,
  } satisfies DepositDetail;
}

const ids = (d: DepositDetail) => depositTimeline(d).map((step) => step.state);
const statuses = (d: DepositDetail) => depositTimeline(d).map((step) => step.status);

describe("deposit timeline (PRD section 6)", () => {
  it("ar_usdc never shows fx_executed or wire_sent, even when the backend sends them", () => {
    const d = deposit("ar_usdc", [
      "deposit_notified",
      "partner_collected",
      "fx_executed",
      "wire_sent",
    ]);
    expect(ids(d)).toEqual([
      "deposit_notified",
      "partner_collected",
      "broker_credited",
      "invested",
    ]);
    // Stuck in a hidden state: the last visible one reached is the current step.
    expect(statuses(d)).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("ar_usdc calls partner_collected USDC recibido", () => {
    const step = depositTimeline(deposit("ar_usdc", ["deposit_notified"])).find(
      (s) => s.state === "partner_collected",
    );
    expect(step?.labelKey).toBe("deposit.state.partner_collected_usdc");
  });

  it("ar_swift shows the whole path with the friendly labels", () => {
    const d = deposit("ar_swift", ["deposit_notified", "partner_collected", "fx_executed"]);
    expect(ids(d)).toEqual([
      "deposit_notified",
      "partner_collected",
      "fx_executed",
      "wire_sent",
      "broker_credited",
      "invested",
    ]);
    expect(depositTimeline(d).map((s) => s.labelKey)).toEqual(
      ids(d).map((state) => `deposit.state.${state}`),
    );
    expect(statuses(d)).toEqual(["done", "done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("dates the steps reached with their history time", () => {
    const steps = depositTimeline(deposit("ar_usdc", ["deposit_notified", "partner_collected"]));
    expect(steps.map((s) => s.at)).toEqual([at(0), at(1), undefined, undefined]);
  });

  it("an invested deposit is done all the way", () => {
    const d = deposit("ar_usdc", [
      "deposit_notified",
      "partner_collected",
      "broker_credited",
      "invested",
    ]);
    expect(statuses(d)).toEqual(["done", "done", "done", "done"]);
  });

  it("returned ends the line as an error after the last step reached", () => {
    const d = deposit("ar_usdc", ["deposit_notified", "partner_collected", "returned"]);
    expect(ids(d)).toEqual(["deposit_notified", "partner_collected", "returned"]);
    expect(statuses(d)).toEqual(["done", "done", "error"]);
    expect(depositTimeline(d).at(-1)?.at).toBe(at(2));
  });

  it("shows the account steps as context on the first deposit only", () => {
    const first = deposit("ar_usdc", ["deposit_notified"], { isFirstDeposit: true });
    expect(ids(first).slice(0, 2)).toEqual(["kyc_passed", "ibkr_open"]);
    expect(statuses(first).slice(0, 3)).toEqual(["done", "done", "current"]);
    expect(ids(deposit("ar_usdc", ["deposit_notified"]))[0]).toBe("deposit_notified");
  });
});

describe("stateLabelKey", () => {
  it("calls partner_collected 'USDC recibido' on ar_usdc only", () => {
    expect(stateLabelKey({ rail: "ar_usdc", state: "partner_collected" })).toBe(
      "deposit.state.partner_collected_usdc",
    );
    expect(stateLabelKey({ rail: "ar_swift", state: "partner_collected" })).toBe(
      "deposit.state.partner_collected",
    );
    expect(stateLabelKey({ rail: "ar_usdc", state: "invested" })).toBe("deposit.state.invested");
  });
});
