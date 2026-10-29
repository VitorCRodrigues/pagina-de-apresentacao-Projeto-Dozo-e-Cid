import { createContext, useContext } from "react";
import type { OnboardingDraft } from "@/api/proposed-types";
import type { AppConfig, Me } from "@/api/types";

export interface OnboardingContextValue {
  draft: OnboardingDraft;
  me: Me;
  config: AppConfig;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Steps render under OnboardingLayout, which loads the draft, the client and the config first.
export function useOnboardingContext(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboardingContext outside OnboardingLayout");
  return value;
}
