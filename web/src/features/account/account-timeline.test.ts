import { describe, expect, it } from "vitest";
import { accountTimeline } from "./account-timeline";

const statuses = (status: Parameters<typeof accountTimeline>[0]) =>
  accountTimeline(status)?.map((step) => step.status) ?? null;

describe("account opening timeline", () => {
  it("follows submitted → kyc_review → ibkr_pending → open", () => {
    expect(accountTimeline("submitted")?.map((step) => step.id)).toEqual([
      "submitted",
      "kyc_review",
      "ibkr_pending",
      "open",
    ]);
    expect(statuses("submitted")).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(statuses("kyc_review")).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(statuses("ibkr_pending")).toEqual(["done", "done", "current", "upcoming"]);
    expect(statuses("open")).toEqual(["done", "done", "done", "done"]);
  });

  it("puts action_required on the Interactive Brokers step, as current with a note", () => {
    const steps = accountTimeline("action_required");
    expect(steps?.map((step) => step.status)).toEqual(["done", "done", "current", "upcoming"]);
    expect(steps?.[2]?.noteKey).toBe("account.timeline.actionNote");
  });

  it("has no timeline for draft, rejected and restricted", () => {
    expect(accountTimeline("draft")).toBeNull();
    expect(accountTimeline("rejected")).toBeNull();
    expect(accountTimeline("restricted")).toBeNull();
  });
});
