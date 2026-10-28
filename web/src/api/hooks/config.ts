import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { getConfig } from "../endpoints";
import { queryKeys } from "../query-keys";

export function useConfig() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => getConfig(api),
    staleTime: 5 * 60_000,
  });
}
