import { describe, expect, it } from "vitest";
import { onboardingSteps, type OnboardingDraft } from "@/api/proposed-types";
import { paths } from "@/routes";
import { canVisit, nextStep, previousStep, resumeStep, stepFromSlug, stepSlugs } from "./steps";

const atAddress: OnboardingDraft = {
  currentStep: "address",
  steps: { residence: { country: "AR" }, personal: { fullName: "Lucía Fernández" } },
};

describe("onboarding steps", () => {
  it("resumes at the draft's current step", () => {
    expect(resumeStep(atAddress)).toBe("address");
  });

  it("lets the client visit reached steps only", () => {
    expect(canVisit("residence", atAddress)).toBe(true);
    expect(canVisit("address", atAddress)).toBe(true);
    expect(canVisit("terms", atAddress)).toBe(false);
  });

  it("walks the PRD order and stops at both ends", () => {
    expect(nextStep("residence")).toBe("personal");
    expect(nextStep("review")).toBeNull();
    expect(previousStep("personal")).toBe("residence");
    expect(previousStep("residence")).toBeNull();
  });

  it("maps every step to a unique Spanish slug and back", () => {
    const slugs = onboardingSteps.map((step) => stepSlugs[step]);
    expect(new Set(slugs).size).toBe(8);
    expect(stepFromSlug("domicilio")).toBe("address");
    expect(stepFromSlug("x")).toBeNull();
    expect(stepFromSlug(undefined)).toBeNull();
    expect(paths.onboardingStep("terms")).toBe("/onboarding/terminos");
  });
});
