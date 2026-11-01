import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import {
  acceptTerms,
  getAccount,
  getMe,
  getNotifications,
  getTerms,
  joinWaitlist,
  markNotificationRead,
  uploadDocument,
} from "../endpoints";
import type { TermsAcceptance, WaitlistRequest } from "../proposed-types";
import { queryKeys } from "../query-keys";

export function useMe() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => getMe(api),
    enabled: status === "signedIn",
  });
}

// `poll` refreshes every 60 s while the account waits on someone else (T3).
export function useAccount({ poll = false }: { poll?: boolean } = {}) {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: () => getAccount(api),
    enabled: status === "signedIn",
    refetchInterval: poll ? 60_000 : false,
  });
}

// The current versions of the advisory agreement, cost disclosure, privacy policy and the
// consent to send data to Interactive Brokers (onboarding step 7).
export function useTermsDocuments() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.terms,
    queryFn: () => getTerms(api),
    enabled: status === "signedIn",
  });
}

export function useUploadDocument() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pendingItemId,
      file,
      onProgress,
    }: {
      pendingItemId: string;
      file: File;
      onProgress?: (fraction: number) => void;
    }) => uploadDocument(api, pendingItemId, file, onProgress),
    onSuccess: (account) => {
      // An empty reply carries no account: read it again.
      if (account) queryClient.setQueryData(queryKeys.account, account);
      else void queryClient.invalidateQueries({ queryKey: queryKeys.account });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useNotifications() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => getNotifications(api),
    enabled: status === "signedIn",
  });
}

// Both change what is pending: the list and the account's pending items are read again.
function useRefreshPending() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    void queryClient.invalidateQueries({ queryKey: queryKeys.account });
  };
}

export function useAcceptTerms() {
  const api = useApi();
  const queryClient = useQueryClient();
  const refresh = useRefreshPending();
  return useMutation({
    mutationFn: (body: TermsAcceptance) => acceptTerms(api, body),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: queryKeys.terms });
    },
  });
}

export function useMarkNotificationRead() {
  const api = useApi();
  const refresh = useRefreshPending();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(api, id),
    onSuccess: refresh,
  });
}

export function useJoinWaitlist() {
  const api = useApi();
  return useMutation({ mutationFn: (body: WaitlistRequest) => joinWaitlist(api, body) });
}
