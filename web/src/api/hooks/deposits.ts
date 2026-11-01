import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import {
  createDeposit,
  createQuote,
  getDeposit,
  getDeposits,
  notifyDepositSent,
} from "../endpoints";
import type { CreateDepositRequest, DepositDetail, QuoteRequest } from "../proposed-types";
import { queryKeys } from "../query-keys";
import { clockOffset } from "@/lib/clock";
import type { DepositState, Quote } from "../types";

const POLL_MS = 30_000;
const FINAL_STATES: readonly DepositState[] = ["invested", "returned"];

// PRD section 9: the deposit detail polls every 30 s, and stops once nothing can change.
export function depositPollingInterval(deposit: DepositDetail | undefined): number | false {
  return deposit && FINAL_STATES.includes(deposit.state) ? false : POLL_MS;
}

export interface TimedQuote {
  quote: Quote;
  // Server time minus device time, from the quote response's Date header: the countdown runs
  // on the server's clock even when the phone's is off. 409 quote_expired stays final.
  clockOffsetMs: number;
}

// A quote is created on demand (POST), so it is a mutation, not a cached query.
export function useQuote() {
  const api = useApi();
  return useMutation({
    mutationFn: async (body: QuoteRequest): Promise<TimedQuote> => {
      let clockOffsetMs = 0;
      const quote = await createQuote(api, body, (response) => {
        clockOffsetMs = clockOffset(response.headers.get("Date"), Date.now());
      });
      return { quote, clockOffsetMs };
    },
  });
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

// Most recent first, filtered by any of `states`, paged by cursor (T10).
export function useDeposits({ states }: { states?: readonly DepositState[] } = {}) {
  const api = useApi();
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.deposits(states),
    queryFn: ({ pageParam }) =>
      getDeposits(api, { ...(states && { states }), ...(pageParam && { cursor: pageParam }) }),
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

export function useSentNotice(id: string) {
  const api = useApi();
  return useMutation({ mutationFn: () => notifyDepositSent(api, id) });
}
