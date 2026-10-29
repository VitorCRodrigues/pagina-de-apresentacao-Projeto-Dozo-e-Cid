import { z } from "zod";
import { onboardingSteps } from "./proposed-types";
import type { ResponseName, ResponseTypes } from "./response-types";

// Runtime mirrors of types.ts and proposed-types.ts. schemas.test.ts checks that each
// inferred type equals its TypeScript counterpart, so the two cannot drift apart.

const cents = z.number().int();
const isoDate = z.iso.datetime();

// --- Codes (section 8) ---

export const countrySchema = z.enum(["AR", "BR"]);
export const localeSchema = z.enum(["es", "pt", "en"]);
export const railSchema = z.enum(["ar_usdc", "ar_swift", "br_efx", "br_fxbank"]);

export const depositStateSchema = z.enum([
  "kyc_passed",
  "ibkr_open",
  "deposit_notified",
  "partner_collected",
  "fx_executed",
  "wire_sent",
  "broker_credited",
  "invested",
  "returned",
]);

export const accountStatusSchema = z.enum([
  "draft",
  "submitted",
  "kyc_review",
  "ibkr_pending",
  "action_required",
  "open",
  "restricted",
  "rejected",
]);

export const blockReasonSchema = z.enum([
  "ibkr_not_open",
  "ibkr_restricted",
  "compliance_hold",
  "quote_expired",
  "pix_med_hold",
  "market_not_live",
]);

export const rails = railSchema.options;
export const depositStates = depositStateSchema.options;
export const accountStatuses = accountStatusSchema.options;
export const blockReasons = blockReasonSchema.options;

// --- Section 8 types ---

export const appConfigSchema = z.object({
  liveMarkets: z.array(countrySchema),
  minRecurringUsdCents: cents,
  minDepositUsdCents: cents,
  efxCapUsdCents: cents,
  railsByCountry: z.record(countrySchema, z.array(railSchema)),
  investmentWindowDay: z.number().int().min(1).max(31),
  ibkrPortalUrl: z.url(),
});

export const meSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  country: countrySchema,
  locale: localeSchema,
  accountStatus: accountStatusSchema,
});

export const pendingItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["document", "deposit_action", "terms", "notice"]),
  title: z.string(),
  description: z.string(),
  dueAt: isoDate.optional(),
  depositId: z.string().optional(),
});

export const accountSchema = z.object({
  status: accountStatusSchema,
  ibkrAccountMasked: z.string().optional(),
  pending: z.array(pendingItemSchema),
  blockReasons: z.array(blockReasonSchema),
});

export const costLineSchema = z.object({
  kind: z.enum(["iof", "fx_spread", "rail_fee", "allocation_min", "advisory_fee"]),
  label: z.string(),
  amountCents: cents,
  percent: z.number(),
  estimated: z.boolean(),
});

export const railOptionSchema = z.object({
  rail: railSchema,
  recommended: z.boolean(),
  costs: z.array(costLineSchema),
  totalCostCents: cents,
  netToInvestCents: cents,
  expectedDays: z.object({ min: z.number().int(), max: z.number().int() }),
});

export const quoteSchema = z.object({
  id: z.string(),
  amountCents: cents,
  options: z.array(railOptionSchema),
  expiresAt: isoDate,
});

export const depositInstructionsUsdcSchema = z.object({
  type: z.literal("usdc"),
  token: z.literal("USDC"),
  network: z.string(),
  address: z.string(),
  memo: z.string().optional(),
});

export const depositInstructionsWireSchema = z.object({
  type: z.literal("wire"),
  beneficiaryName: z.string(),
  accountNumber: z.string(),
  bankName: z.string(),
  swiftBic: z.string(),
  reference: z.string(),
});

export const stateEventSchema = z.object({ state: depositStateSchema, at: isoDate });

const depositFields = {
  id: z.string(),
  rail: railSchema,
  state: depositStateSchema,
  amountCents: cents,
  costs: z.array(costLineSchema),
  creditedCents: cents.optional(),
  investedCents: cents.optional(),
  history: z.array(stateEventSchema),
  expectedBy: isoDate.optional(),
  nextInvestmentWindow: isoDate.optional(),
  returnReason: z.string().optional(),
  createdAt: isoDate,
};

export const depositSchema = z.object({
  ...depositFields,
  instructions: z
    .discriminatedUnion("type", [depositInstructionsUsdcSchema, depositInstructionsWireSchema])
    .optional(),
});

export const positionSchema = z.object({
  // UCITS, Irish domicile: never a US ISIN (section 8).
  isin: z.string().regex(/^IE[A-Z0-9]{9}\d$/),
  name: z.string(),
  shares: z.number().int().nonnegative(),
  valueCents: cents,
  weight: z.number(),
  targetWeight: z.number(),
  description: z.string(),
});

export const portfolioSchema = z.object({
  totalCents: cents,
  buckets: z.object({
    inFlightCents: cents,
    ibkrCashCents: cents,
    investedCents: cents,
    feesPaidCents: cents,
  }),
  positions: z.array(positionSchema),
  asOf: isoDate,
});

export const planSchema = z.object({
  id: z.string(),
  amountCents: cents,
  dayOfMonth: z.number().int(),
  rail: railSchema,
  status: z.enum(["active", "paused", "cancelled"]),
  nextRunAt: isoDate.optional(),
});

// --- docs/api-gaps.md proposals ---

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    until: isoDate.optional(),
  }),
});

export const waitlistRequestSchema = z.object({
  email: z.email(),
  country: z.string().regex(/^[A-Z]{2}$/),
});

export const onboardingStepSchema = z.enum(onboardingSteps);

export const onboardingDraftSchema = z.object({
  currentStep: onboardingStepSchema,
  steps: z.partialRecord(onboardingStepSchema, z.record(z.string(), z.unknown())),
});

export const questionnaireSchema = z.object({
  version: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["single", "multi"]),
      label: z.string(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
    }),
  ),
});

export const notificationSchema = pendingItemSchema.extend({
  createdAt: isoDate,
  readAt: isoDate.optional(),
});

export const notificationPrefsSchema = z.object({ email: z.boolean(), push: z.boolean() });

export const termsDocumentSchema = z.object({
  id: z.string(),
  kind: z.enum(["advisory_agreement", "cost_disclosure", "privacy_policy", "ibkr_data_consent"]),
  version: z.string(),
  title: z.string(),
  url: z.string(),
  acceptedAt: isoDate.optional(),
});

const scope = z.object({ scope: z.enum(["account", "deposit"]) });

export const depositDetailSchema = z.object({
  ...depositFields,
  isFirstDeposit: z.boolean(),
  quote: z
    .object({ id: z.string(), rateDescription: z.string().optional(), createdAt: isoDate })
    .optional(),
  blockReason: blockReasonSchema.optional(),
  instructions: z
    .discriminatedUnion("type", [
      depositInstructionsUsdcSchema.extend(scope.shape),
      depositInstructionsWireSchema.extend(scope.shape),
    ])
    .optional(),
});

export const depositsPageSchema = z.object({
  items: z.array(depositDetailSchema),
  nextCursor: z.string().optional(),
});

export const quoteRequestSchema = z.object({ amountCents: cents, planId: z.string().optional() });

export const createDepositRequestSchema = z.object({ quoteId: z.string(), rail: railSchema });

// decisions.md, item 16: rail required, day 1–28.
export const createPlanRequestSchema = z.object({
  amountCents: cents,
  dayOfMonth: z.number().int().min(1).max(28),
  rail: railSchema,
});

export const updatePlanRequestSchema = createPlanRequestSchema
  .partial()
  .extend({ status: planSchema.shape.status.optional() });

// --- Named responses, loaded by the client only when it validates ---

export const responseSchemas = {
  config: appConfigSchema,
  me: meSchema,
  account: accountSchema,
  onboarding: onboardingDraftSchema,
  questionnaire: questionnaireSchema,
  portfolio: portfolioSchema,
  plans: z.array(planSchema),
  plan: planSchema,
  quote: quoteSchema,
  deposit: depositDetailSchema,
  depositsPage: depositsPageSchema,
  notifications: z.array(notificationSchema),
  notificationPrefs: notificationPrefsSchema,
  terms: z.array(termsDocumentSchema),
} satisfies { [K in ResponseName]: z.ZodType<ResponseTypes[K]> };
