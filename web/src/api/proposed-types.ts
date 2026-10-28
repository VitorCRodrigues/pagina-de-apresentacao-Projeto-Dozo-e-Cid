// Proposed in docs/api-gaps.md, pending confirmation with Dozo. Section 8 types stay in types.ts.
import type {
  BlockReason,
  Country,
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

export interface WaitlistRequest {
  email: string;
  country: Country;
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
    kind: "single" | "multi" | "number";
    label: string;
    options?: { value: string; label: string }[];
  }[];
}

// api-gaps.md, item 1 (GET /notifications).
export interface Notification extends PendingItem {
  createdAt: string;
  readAt?: string;
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
