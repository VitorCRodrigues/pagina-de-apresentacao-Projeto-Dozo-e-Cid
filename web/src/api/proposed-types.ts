// Proposed in docs/api-gaps.md, pending confirmation with Dozo. Section 8 types stay in types.ts.
import type {
  AppConfig,
  BlockReason,
  Deposit,
  DepositInstructionsUsdc,
  DepositInstructionsWire,
  PendingItem,
  Plan,
  Rail,
} from "./types";

export const apiErrorCodes = [
  "validation_failed",
  "quote_expired",
  "below_minimum",
  "account_not_open",
  "account_restricted",
  "compliance_hold",
  "market_not_live",
  "idempotency_conflict",
  "not_found",
  "session_expired",
  "maintenance",
  "rate_limited",
  "internal",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    until?: string;
  };
}

// Any ISO 3166-1 alpha-2 code: onboarding step 1 offers countries outside Country.
export interface WaitlistRequest {
  email: string;
  country: string;
}

// api-gaps.md, item 2.
export const onboardingSteps = [
  "residence",
  "personal",
  "address",
  "suitability",
  "funds",
  "identity",
  "terms",
  "review",
] as const;

export type OnboardingStep = (typeof onboardingSteps)[number];

export interface OnboardingDraft {
  currentStep: OnboardingStep;
  steps: Partial<Record<OnboardingStep, Record<string, unknown>>>;
}

export interface Questionnaire {
  version: string;
  questions: {
    id: string;
    // Brackets (income, net worth) are single choices with closed options from the API.
    kind: "single" | "multi";
    label: string;
    options: { value: string; label: string }[];
  }[];
}

// Draft body of PUT /onboarding/terms (api-gaps.md, item 2), and the body of
// POST /account/terms/{id}/accept for new terms from T11 (api-gaps.md, item 1).
export interface TermsAcceptance {
  id: string;
  version: string;
  acceptedAt: string;
}

// api-gaps.md, item 1 (GET /notifications). planId: the monthly plan's reminder ("Hora de tu
// aporte"), which opens T6 with the plan's amount. termsId: which document a "terms" item asks
// the client to accept (its version comes from GET /account/terms).
export interface Notification extends PendingItem {
  createdAt: string;
  readAt?: string;
  planId?: string;
  termsId?: string;
}

export interface NotificationPrefs {
  email: boolean;
  push: boolean;
}

// api-gaps.md, item 1 (GET /account/terms).
export interface TermsDocument {
  id: string;
  kind: "advisory_agreement" | "cost_disclosure" | "privacy_policy" | "ibkr_data_consent";
  version: string;
  title: string;
  url: string;
  acceptedAt?: string;
}

// api-gaps.md, item 7: the client must know whether to reuse an address.
export interface ScopedUsdcInstructions extends DepositInstructionsUsdc {
  scope: "account" | "deposit";
}

export interface ScopedWireInstructions extends DepositInstructionsWire {
  scope: "account" | "deposit";
}

export type ScopedInstructions = ScopedUsdcInstructions | ScopedWireInstructions;

// api-gaps.md, item 8: the next investment window for the home screen (T4), from the server.
export interface ProposedConfig extends AppConfig {
  nextInvestmentWindow?: string;
}

// api-gaps.md, items 5, 6 and 8.
export interface DepositDetail extends Omit<Deposit, "instructions"> {
  isFirstDeposit: boolean;
  quote?: { id: string; rateDescription?: string; createdAt: string };
  blockReason?: BlockReason;
  instructions?: ScopedInstructions;
}

export interface DepositsPage {
  items: DepositDetail[];
  nextCursor?: string;
}

export interface QuoteRequest {
  amountCents: number;
  planId?: string;
}

export interface CreateDepositRequest {
  quoteId: string;
  rail: Rail;
}

export interface CreatePlanRequest {
  amountCents: number;
  dayOfMonth: number;
  rail: Rail;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  status?: Plan["status"];
}
