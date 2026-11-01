import type { DepositState } from "./types";

// Everything under "session" holds personal data and is dropped on sign-out (ApiProvider).
export const queryKeys = {
  config: ["config"],
  me: ["session", "me"],
  account: ["session", "account"],
  onboarding: ["session", "onboarding"],
  questionnaire: ["session", "questionnaire"],
  portfolio: ["session", "portfolio"],
  plans: ["session", "plans"],
  // T5 cost preview: an estimate for one monthly amount.
  planQuote: (amountCents: number, planId?: string) =>
    ["session", "plan-quote", { amountCents, planId }] as const,
  deposits: (states?: readonly DepositState[]) => ["session", "deposits", { states }] as const,
  depositsAll: ["session", "deposits"],
  deposit: (id: string) => ["session", "deposit", id] as const,
  notifications: ["session", "notifications"],
  terms: ["session", "terms"],
} as const;
