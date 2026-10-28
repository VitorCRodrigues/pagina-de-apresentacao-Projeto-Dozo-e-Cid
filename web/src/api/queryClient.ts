import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

// One retry, and only for failures that can change on their own (network, 5xx).
// A 4xx (expired session, validation, blocked account) answers the same the second time.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
