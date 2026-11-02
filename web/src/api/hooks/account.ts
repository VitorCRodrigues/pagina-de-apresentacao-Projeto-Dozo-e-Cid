import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import {
  acceptTerms,
  getAccount,
  getMe,
  getNotificationPrefs,
  getNotifications,
  getSuitability,
  getTerms,
  joinWaitlist,
  markNotificationRead,
  saveSuitability,
  updateMe,
  updateNotificationPrefs,
  uploadDocument,
} from "../endpoints";
import type {
  NotificationPrefs,
  SaveSuitabilityRequest,
  TermsAcceptance,
  UpdateMeRequest,
  WaitlistRequest,
} from "../proposed-types";
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

// The language saved on the account (T12). The choice on the device is in locale-preference.
export function useUpdateMe() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => updateMe(api, body),
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me, me);
    },
  });
}

export function useNotificationPrefs() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: () => getNotificationPrefs(api),
    enabled: status === "signedIn",
  });
}

// Optimistic: the box answers at once, and a failed request brings back only the field it was
// changing, so two quick toggles never undo each other.
export function useUpdateNotificationPrefs() {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = queryKeys.notificationPrefs;
  return useMutation({
    mutationFn: (body: Partial<NotificationPrefs>) => updateNotificationPrefs(api, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPrefs>(key);
      if (previous) queryClient.setQueryData<NotificationPrefs>(key, { ...previous, ...body });
      return { previous };
    },
    onError: (_error, body, context) => {
      const current = queryClient.getQueryData<NotificationPrefs>(key);
      const previous = context?.previous;
      if (!current || !previous) return;
      const undone = Object.fromEntries(
        Object.keys(body).map((f) => [f, previous[f as keyof NotificationPrefs]]),
      );
      queryClient.setQueryData<NotificationPrefs>(key, { ...current, ...undone });
    },
    mutationKey: key,
    // Read again only after the last one: an earlier answer must not undo a later toggle.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: key }) === 1) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useSuitability() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.suitability,
    queryFn: () => getSuitability(api),
    enabled: status === "signedIn",
  });
}

export function useSaveSuitability() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveSuitabilityRequest) => saveSuitability(api, body),
    onSuccess: (record) => {
      queryClient.setQueryData(queryKeys.suitability, record);
    },
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
