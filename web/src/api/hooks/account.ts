import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import { getAccount, getMe, getNotifications, joinWaitlist, uploadDocument } from "../endpoints";
import type { WaitlistRequest } from "../proposed-types";
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

export function useAccount() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: () => getAccount(api),
    enabled: status === "signedIn",
  });
}

export function useUploadDocument() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pendingItemId, file }: { pendingItemId: string; file: File }) =>
      uploadDocument(api, pendingItemId, file),
    onSuccess: (account) => {
      queryClient.setQueryData(queryKeys.account, account);
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

export function useJoinWaitlist() {
  const api = useApi();
  return useMutation({ mutationFn: (body: WaitlistRequest) => joinWaitlist(api, body) });
}
