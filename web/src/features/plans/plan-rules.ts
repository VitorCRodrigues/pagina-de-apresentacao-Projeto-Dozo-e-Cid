import { z } from "@/lib/zod";
import type { CreatePlanRequest } from "@/api/proposed-types";
import type { AppConfig, Country, Locale, Plan, Rail } from "@/api/types";
import { amountField } from "@/features/deposits/rules";

// T5 rules (PRD section 5, decision 16). The backend enforces them; these guide the client
// with the values from GET /config.

export type PlanFormError = "invalidAmount" | "belowMinimum" | "invalidDay" | "invalidRail";

const DEFAULT_RAIL: Rail = "ar_usdc";

// The client's country rails, only while that country is live; ar_usdc (cheapest) first.
export function planRails(config: AppConfig, country: Country): Rail[] {
  if (!config.liveMarkets.includes(country)) return [];
  const rails = config.railsByCountry[country];
  return [...rails].sort((a, b) => Number(b === DEFAULT_RAIL) - Number(a === DEFAULT_RAIL));
}

// The monthly plan form → the POST /plans body. Day 1 to 28, so every month has it.
export function planFormSchema(config: AppConfig, locale: Locale, rails: readonly Rail[]) {
  return z
    .object({
      amount: amountField(config, locale, "recurring"),
      dayOfMonth: z
        .unknown()
        .refine(
          (day) => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 28,
          { message: "invalidDay" satisfies PlanFormError },
        ),
      rail: z.unknown().refine((rail) => rails.includes(rail as Rail), {
        message: "invalidRail" satisfies PlanFormError,
      }),
    })
    .transform(({ amount, dayOfMonth, rail }): CreatePlanRequest => ({
      amountCents: amount,
      dayOfMonth: dayOfMonth as number,
      rail: rail as Rail,
    }));
}

export type PlanAction = "pause" | "resume" | "edit" | "cancel";

const actions: Record<Plan["status"], PlanAction[]> = {
  active: ["pause", "edit", "cancel"],
  paused: ["resume", "edit", "cancel"],
  cancelled: [],
};

export function planActions(status: Plan["status"]): PlanAction[] {
  return actions[status];
}

// Where an action takes the plan; null when the action does not apply to that status.
export function nextStatus(status: Plan["status"], action: PlanAction): Plan["status"] | null {
  if (!actions[status].includes(action)) return null;
  switch (action) {
    case "pause":
      return "paused";
    case "resume":
      return "active";
    case "cancel":
      return "cancelled";
    case "edit":
      return status;
  }
}

// The plan the screen is about: the first one not cancelled.
export function currentPlan(plans: readonly Plan[]): Plan | undefined {
  return plans.find((plan) => plan.status !== "cancelled");
}
