import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import { createDeposit, createQuote, getDeposit, getDeposits } from "../endpoints";
import type { CreateDepositRequest, DepositDetail, QuoteRequest } from "../proposed-types";
import { queryKeys } from "../query-keys";
import type { DepositState } from "../types";

const POLL_MS = 30_000;
const FINAL_STATES: readonly DepositState[] = ["invested", "returned"];

// PRD section 9: the deposit detail polls every 30 s, and stops once nothing can change.
export function depositPollingInterval(deposit: DepositDetail | undefined): number | false {
  return deposit && FINAL_STATES.includes(deposit.state) ? false : POLL_MS;
}

// A quote is created on demand (POST), so it is a mutation, not a cached query.
export function useQuote() {
  const api = useApi();
  return useMutation({ mutationFn: (body: QuoteRequest) => createQuote(api, body) });
}

export function useCreateDeposit() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: CreateDepositRequest;
      idempotencyKey: string;
    }) => createDeposit(api, body, idempotencyKey),
    onSuccess: (deposit) => {
      queryClient.setQueryData(queryKeys.deposit(deposit.id), deposit);
      void queryClient.invalidateQueries({ queryKey: queryKeys.depositsAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

// Most recent first, filtered by state, paged by cursor (T10).
export function useDeposits({ state }: { state?: DepositState } = {}) {
  const api = useApi();
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.deposits(state),
    queryFn: ({ pageParam }) =>
      getDeposits(api, { ...(state && { state }), ...(pageParam && { cursor: pageParam }) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: status === "signedIn",
  });
}

export function useDeposit(id: string) {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.deposit(id),
    queryFn: () => getDeposit(api, id),
    enabled: status === "signedIn",
    refetchInterval: (query) => depositPollingInterval(query.state.data),
  });
}
