import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import { createPlan, getPlans, updatePlan } from "../endpoints";
import type { CreatePlanRequest, UpdatePlanRequest } from "../proposed-types";
import { queryKeys } from "../query-keys";

export function usePlans() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => getPlans(api),
    enabled: status === "signedIn",
  });
}

// The caller owns the key (useIdempotencyKey), so a retried click reuses it.
export function useCreatePlan() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreatePlanRequest; idempotencyKey: string }) =>
      createPlan(api, body, idempotencyKey),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.plans }),
  });
}

// Pause, resume, edit and cancel (status "cancelled") all go through PATCH.
export function useUpdatePlan() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlanRequest }) =>
      updatePlan(api, id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.plans }),
  });
}
