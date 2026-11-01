import { describe, expect, it } from "vitest";
import type { Plan } from "@/api/types";
import { config } from "@/mocks/fixtures";
import { currentPlan, nextStatus, planActions, planFormSchema, planRails } from "./plan-rules";

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("planRails", () => {
  it("offers the country's rails, ar_usdc first", () => {
    expect(planRails(config, "AR")).toEqual(["ar_usdc", "ar_swift"]);
    expect(
      planRails(
        { ...config, railsByCountry: { ...config.railsByCountry, AR: ["ar_swift", "ar_usdc"] } },
        "AR",
      ),
    ).toEqual(["ar_usdc", "ar_swift"]);
  });

  it("shows Brazil's rails only once BR is live", () => {
    expect(planRails(config, "BR")).toEqual([]);
    expect(planRails({ ...config, liveMarkets: ["AR", "BR"] }, "BR")).toEqual([
      "br_efx",
      "br_fxbank",
    ]);
  });
});

describe("planFormSchema", () => {
  const schema = planFormSchema(config, "es", ["ar_usdc", "ar_swift"]);
  const valid = { amount: "500", dayOfMonth: 10, rail: "ar_usdc" };

  it("turns the form into the POST /plans body", () => {
    const result = schema.safeParse(valid);
    expect(result.success && result.data).toEqual({
      amountCents: 50000,
      dayOfMonth: 10,
      rail: "ar_usdc",
    });
  });

  it("refuses an amount below the monthly minimum or in another locale's format", () => {
    expect(issues(schema.safeParse({ ...valid, amount: "249,99" }))).toEqual(["belowMinimum"]);
    expect(issues(schema.safeParse({ ...valid, amount: "1,000.50" }))).toEqual(["invalidAmount"]);
  });

  it("accepts days 1 to 28 only (decision 16)", () => {
    for (const day of [1, 28])
      expect(schema.safeParse({ ...valid, dayOfMonth: day }).success).toBe(true);
    for (const day of [0, 29, 31, 2.5, Number.NaN]) {
      expect(issues(schema.safeParse({ ...valid, dayOfMonth: day }))).toEqual(["invalidDay"]);
    }
  });

  it("requires one of the offered rails", () => {
    expect(issues(schema.safeParse({ ...valid, rail: "br_efx" }))).toEqual(["invalidRail"]);
    expect(issues(schema.safeParse({ ...valid, rail: "" }))).toEqual(["invalidRail"]);
  });
});

describe("plan transitions", () => {
  it("lists the actions each status allows", () => {
    expect(planActions("active")).toEqual(["pause", "edit", "cancel"]);
    expect(planActions("paused")).toEqual(["resume", "edit", "cancel"]);
    expect(planActions("cancelled")).toEqual([]);
  });

  it("moves between statuses, and refuses what does not apply", () => {
    expect(nextStatus("active", "pause")).toBe("paused");
    expect(nextStatus("paused", "resume")).toBe("active");
    expect(nextStatus("active", "cancel")).toBe("cancelled");
    expect(nextStatus("paused", "cancel")).toBe("cancelled");
    expect(nextStatus("active", "edit")).toBe("active");
    expect(nextStatus("paused", "edit")).toBe("paused");
    expect(nextStatus("active", "resume")).toBeNull();
    expect(nextStatus("paused", "pause")).toBeNull();
    for (const action of ["pause", "resume", "edit", "cancel"] as const) {
      expect(nextStatus("cancelled", action)).toBeNull();
    }
  });
});

describe("currentPlan", () => {
  const plan = (id: string, status: Plan["status"]): Plan => ({
    id,
    amountCents: 50000,
    dayOfMonth: 5,
    rail: "ar_usdc",
    status,
  });

  it("is the first plan that is not cancelled", () => {
    expect(
      currentPlan([plan("a", "cancelled"), plan("b", "paused"), plan("c", "active")])?.id,
    ).toBe("b");
  });

  it("is undefined when every plan was cancelled", () => {
    expect(currentPlan([plan("a", "cancelled")])).toBeUndefined();
    expect(currentPlan([])).toBeUndefined();
  });
});
