import type {
  DepositDetail,
  DepositsPage,
  Notification,
  NotificationPrefs,
  OnboardingDraft,
  ProposedConfig,
  Questionnaire,
  TermsDocument,
} from "./proposed-types";
import type { Account, Me, Plan, Portfolio, Quote } from "./types";

// Response bodies the client can validate, by name. schemas.ts holds one Zod schema per key;
// the client imports it lazily, so production builds ship without Zod.
export interface ResponseTypes {
  config: ProposedConfig;
  me: Me;
  account: Account;
  onboarding: OnboardingDraft;
  questionnaire: Questionnaire;
  portfolio: Portfolio;
  plans: Plan[];
  plan: Plan;
  quote: Quote;
  deposit: DepositDetail;
  depositsPage: DepositsPage;
  notifications: Notification[];
  notificationPrefs: NotificationPrefs;
  terms: TermsDocument[];
}

export type ResponseName = keyof ResponseTypes;
