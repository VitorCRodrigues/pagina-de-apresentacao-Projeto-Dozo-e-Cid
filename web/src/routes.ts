import type { OnboardingStep } from "@/api/proposed-types";
import { stepSlugs } from "@/features/onboarding/steps";

// Route paths. Spanish slugs: the pilot is in Argentina; screens translate, URLs do not.
export const paths = {
  entry: "/",
  onboarding: "/onboarding",
  onboardingStep: (step: OnboardingStep) => `/onboarding/${stepSlugs[step]}`,
  accountStatus: "/cuenta",
  home: "/inicio",
  // TODO(decisão): placeholder until T5 (monthly plan).
  plan: "/plan",
  deposit: "/aportar",
  portfolio: "/cartera",
  pending: "/pendientes",
  profile: "/perfil",
  sessionExpired: "/sesion-expirada",
  maintenance: "/mantenimiento",
} as const;
