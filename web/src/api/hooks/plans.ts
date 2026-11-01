import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import { createPlan, getPlans, updatePlan } from "../endpoints";
import type { CreatePlanRequest, UpdatePlanRequest } from "../proposed-types";
import { queryKeys } from "../query-keys";
import type { Plan } from "../types";

// `enabled: false` for a screen that needs the plans only sometimes (T6 with ?plan=).
export function usePlans({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => getPlans(api),
    enabled: enabled && status === "signedIn",
  });
}

// The saved plan goes straight into the cache, so the screen never shows the old one while
// the list is read again.
function useSavePlanInCache() {
  const queryClient = useQueryClient();
  return (saved: Plan) => {
    queryClient.setQueryData<Plan[]>(queryKeys.plans, (plans = []) =>
      plans.some((plan) => plan.id === saved.id)
        ? plans.map((plan) => (plan.id === saved.id ? saved : plan))
        : [saved, ...plans],
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans });
  };
}

// The caller owns the key (useIdempotencyKey), so a retried click reuses it.
export function useCreatePlan() {
  const api = useApi();
  const save = useSavePlanInCache();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreatePlanRequest; idempotencyKey: string }) =>
      createPlan(api, body, idempotencyKey),
    onSuccess: save,
  });
}

// Pause, resume, edit and cancel (status "cancelled") all go through PATCH.
export function useUpdatePlan() {
  const api = useApi();
  const save = useSavePlanInCache();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlanRequest }) =>
      updatePlan(api, id, body),
    onSuccess: save,
  });
}
