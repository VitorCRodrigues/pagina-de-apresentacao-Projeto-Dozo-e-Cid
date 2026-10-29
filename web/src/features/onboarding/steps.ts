import { onboardingSteps, type OnboardingDraft, type OnboardingStep } from "@/api/proposed-types";

// Spanish slugs, like the rest of the routes: screens translate, URLs do not.
export const stepSlugs: Record<OnboardingStep, string> = {
  residence: "residencia",
  personal: "datos",
  address: "domicilio",
  suitability: "perfil",
  funds: "fondos",
  identity: "identidad",
  terms: "terminos",
  review: "revision",
};

export function stepFromSlug(slug: string | undefined): OnboardingStep | null {
  return onboardingSteps.find((step) => stepSlugs[step] === slug) ?? null;
}

// currentStep is the first unsaved step (docs/api-gaps.md, item 2).
export function resumeStep(draft: OnboardingDraft): OnboardingStep {
  return draft.currentStep;
}

export function canVisit(step: OnboardingStep, draft: OnboardingDraft): boolean {
  return onboardingSteps.indexOf(step) <= onboardingSteps.indexOf(draft.currentStep);
}

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  return onboardingSteps[onboardingSteps.indexOf(step) + 1] ?? null;
}

export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const index = onboardingSteps.indexOf(step);
  return index > 0 ? (onboardingSteps[index - 1] ?? null) : null;
}
