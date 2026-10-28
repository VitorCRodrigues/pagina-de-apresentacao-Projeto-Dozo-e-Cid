import type {
  DepositDetail,
  DepositsPage,
  Notification,
  NotificationPrefs,
  OnboardingDraft,
  Questionnaire,
  TermsDocument,
} from "./proposed-types";
import type { Account, AppConfig, Me, Plan, Portfolio, Quote } from "./types";

// Response bodies the client can validate, by name. schemas.ts holds one Zod schema per key;
// the client imports it lazily, so production builds ship without Zod.
export interface ResponseTypes {
  config: AppConfig;
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
