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
  deposits: (state?: DepositState) => ["session", "deposits", { state }] as const,
  depositsAll: ["session", "deposits"],
  deposit: (id: string) => ["session", "deposit", id] as const,
  notifications: ["session", "notifications"],
} as const;
