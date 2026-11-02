import type { QueryClient } from "@tanstack/react-query";

// Everything a session leaves in memory: answers and unsaved onboarding steps under "session",
// and every mutation, whose variables hold request bodies and pending Idempotency-Keys. Keys
// still in a flow's state go when the flow unmounts, which leaving the guarded routes does.
export function clearSessionData(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: ["session"] });
  queryClient.getMutationCache().clear();
}
