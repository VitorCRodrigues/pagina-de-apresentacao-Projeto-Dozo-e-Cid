import { onboardingSteps, type OnboardingDraft, type OnboardingStep } from "@/api/proposed-types";
import { luciaPersonal } from "@/mocks/fixtures";

// A complete, valid draft up to the identity check; tests and stories cut it per step.
export const savedSteps: OnboardingDraft["steps"] = {
  residence: { country: "AR", nationality: "AR" },
  personal: { ...luciaPersonal },
  address: {
    street: "Av. Corrientes 1234",
    city: "Buenos Aires",
    province: "C",
    postalCode: "C1043AAZ",
  },
  suitability: {
    questionnaireVersion: "2026-10",
    answers: {
      goal: "retirement",
      horizon: "gt10",
      income: "3k10k",
      netWorth: "25k100k",
      experience: ["funds"],
      risk: "hold",
    },
  },
  funds: { occupation: "employee", sourceOfFunds: "salary", isPep: false },
  identity: { status: "approved", reference: "mock-idv-1" },
};

// Every terms document of the mock, accepted at its current version.
export const acceptedTerms = {
  accepted: ["terms-advisory", "terms-costs", "terms-privacy", "terms-ibkr-consent"].map((id) => ({
    id,
    version: "2026-10",
    acceptedAt: "2026-10-29T12:00:00Z",
  })),
};

// The saved steps that come before `step`, as a draft at that step would hold them.
export function stepsBefore(step: OnboardingStep): OnboardingDraft["steps"] {
  const order = onboardingSteps.indexOf(step);
  const all = { ...savedSteps, terms: acceptedTerms };
  return Object.fromEntries(
    Object.entries(all).filter(
      ([saved]) => onboardingSteps.indexOf(saved as OnboardingStep) < order,
    ),
  );
}
