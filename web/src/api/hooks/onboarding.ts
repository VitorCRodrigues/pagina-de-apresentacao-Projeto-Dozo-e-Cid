import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import {
  getOnboarding,
  getQuestionnaire,
  saveOnboardingStep,
  submitOnboarding,
} from "../endpoints";
import type { OnboardingStep } from "../proposed-types";
import { queryKeys } from "../query-keys";

export function useOnboarding() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: () => getOnboarding(api),
    enabled: status === "signedIn",
  });
}

// Each step saves a server-side draft (PRD T2), so going back never loses data.
export function useSaveOnboardingStep() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: OnboardingStep; data: Record<string, unknown> }) =>
      saveOnboardingStep(api, step, data),
    onSuccess: (draft) => {
      queryClient.setQueryData(queryKeys.onboarding, draft);
    },
  });
}

// Comes from the API so legal can change the questions without a deploy (PRD T2).
export function useQuestionnaire() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.questionnaire,
    queryFn: () => getQuestionnaire(api),
    enabled: status === "signedIn",
  });
}

export function useSubmitOnboarding() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitOnboarding(api),
    onSuccess: (account) => {
      queryClient.setQueryData(queryKeys.account, account);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
