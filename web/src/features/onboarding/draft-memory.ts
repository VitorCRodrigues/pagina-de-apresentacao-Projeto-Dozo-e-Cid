import type { QueryClient } from "@tanstack/react-query";
import type { OnboardingStep } from "@/api/proposed-types";

// What the client typed in a step but has not saved yet, so Volver then Continuar keeps it.
// It lives in the query cache under "session", so sign-out drops it with the rest of the
// personal data (ApiProvider), and a reload keeps only what the server draft holds. Never in
// localStorage or sessionStorage.
const prefix = ["session", "onboarding-unsaved"] as const;
const key = (step: OnboardingStep) => [...prefix, step] as const;

export function rememberStep(queryClient: QueryClient, step: OnboardingStep, values: unknown) {
  // No query observes these entries; without this they would be collected after 5 minutes.
  queryClient.setQueryDefaults(prefix, { gcTime: Infinity });
  queryClient.setQueryData(key(step), values);
}

export function recallStep(queryClient: QueryClient, step: OnboardingStep): unknown {
  return queryClient.getQueryData(key(step));
}

export function forgetStep(queryClient: QueryClient, step: OnboardingStep): void {
  queryClient.removeQueries({ queryKey: key(step), exact: true });
}
