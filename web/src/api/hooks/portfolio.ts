import { useQuery } from "@tanstack/react-query";
import { useApi } from "../api-context";
import { useAuth } from "../auth-context";
import { getPortfolio } from "../endpoints";
import { queryKeys } from "../query-keys";

// Values come from the daily IBKR reconciliation (PRD T9), not real time.
export function usePortfolio() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () => getPortfolio(api),
    enabled: status === "signedIn",
  });
}
