import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import type {
  ApiErrorBody,
  CreateDepositRequest,
  CreatePlanRequest,
  DepositDetail,
  DepositsPage,
  Notification,
  NotificationPrefs,
  OnboardingDraft,
  Questionnaire,
  QuoteRequest,
  TermsDocument,
  UpdatePlanRequest,
  WaitlistRequest,
} from "./proposed-types";
import type { ResponseName, ResponseTypes } from "./response-types";
import {
  accountSchema,
  apiErrorBodySchema,
  appConfigSchema,
  costLineSchema,
  createDepositRequestSchema,
  createPlanRequestSchema,
  depositDetailSchema,
  depositSchema,
  depositsPageSchema,
  meSchema,
  notificationPrefsSchema,
  notificationSchema,
  onboardingDraftSchema,
  pendingItemSchema,
  planSchema,
  portfolioSchema,
  positionSchema,
  questionnaireSchema,
  quoteRequestSchema,
  quoteSchema,
  railOptionSchema,
  responseSchemas,
  termsDocumentSchema,
  updatePlanRequestSchema,
  waitlistRequestSchema,
} from "./schemas";
import type {
  Account,
  AppConfig,
  CostLine,
  Deposit,
  Me,
  PendingItem,
  Plan,
  Portfolio,
  Position,
  Quote,
  RailOption,
} from "./types";

const position = {
  isin: "IE00B5BMR087",
  name: "iShares Core S&P 500 UCITS ETF (Acc)",
  shares: 12,
  valueCents: 785040,
  weight: 0.6,
  targetWeight: 0.6,
  description: "Las 500 mayores empresas de EE. UU.",
};

const deposit = {
  id: "dep-1",
  rail: "ar_usdc",
  state: "deposit_notified",
  amountCents: 50000,
  costs: [{ kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false }],
  history: [{ state: "deposit_notified", at: "2026-10-27T12:05:00Z" }],
  createdAt: "2026-10-27T12:05:00Z",
};

describe("schemas", () => {
  it("infer exactly the section 8 types", () => {
    expectTypeOf<z.infer<typeof appConfigSchema>>().toEqualTypeOf<AppConfig>();
    expectTypeOf<z.infer<typeof meSchema>>().toEqualTypeOf<Me>();
    expectTypeOf<z.infer<typeof pendingItemSchema>>().toEqualTypeOf<PendingItem>();
    expectTypeOf<z.infer<typeof accountSchema>>().toEqualTypeOf<Account>();
    expectTypeOf<z.infer<typeof costLineSchema>>().toEqualTypeOf<CostLine>();
    expectTypeOf<z.infer<typeof railOptionSchema>>().toEqualTypeOf<RailOption>();
    expectTypeOf<z.infer<typeof quoteSchema>>().toEqualTypeOf<Quote>();
    expectTypeOf<z.infer<typeof depositSchema>>().toEqualTypeOf<Deposit>();
    expectTypeOf<z.infer<typeof positionSchema>>().toEqualTypeOf<Position>();
    expectTypeOf<z.infer<typeof portfolioSchema>>().toEqualTypeOf<Portfolio>();
    expectTypeOf<z.infer<typeof planSchema>>().toEqualTypeOf<Plan>();
  });

  it("infer exactly the api-gaps.md types", () => {
    expectTypeOf<z.infer<typeof apiErrorBodySchema>>().toEqualTypeOf<ApiErrorBody>();
    expectTypeOf<z.infer<typeof depositDetailSchema>>().toEqualTypeOf<DepositDetail>();
    expectTypeOf<z.infer<typeof depositsPageSchema>>().toEqualTypeOf<DepositsPage>();
    expectTypeOf<z.infer<typeof notificationSchema>>().toEqualTypeOf<Notification>();
    expectTypeOf<z.infer<typeof notificationPrefsSchema>>().toEqualTypeOf<NotificationPrefs>();
    expectTypeOf<z.infer<typeof onboardingDraftSchema>>().toEqualTypeOf<OnboardingDraft>();
    expectTypeOf<z.infer<typeof questionnaireSchema>>().toEqualTypeOf<Questionnaire>();
    expectTypeOf<z.infer<typeof termsDocumentSchema>>().toEqualTypeOf<TermsDocument>();
    expectTypeOf<z.infer<typeof quoteRequestSchema>>().toEqualTypeOf<QuoteRequest>();
    expectTypeOf<
      z.infer<typeof createDepositRequestSchema>
    >().toEqualTypeOf<CreateDepositRequest>();
    expectTypeOf<z.infer<typeof createPlanRequestSchema>>().toEqualTypeOf<CreatePlanRequest>();
    expectTypeOf<z.infer<typeof updatePlanRequestSchema>>().toEqualTypeOf<UpdatePlanRequest>();
    expectTypeOf<z.infer<typeof waitlistRequestSchema>>().toEqualTypeOf<WaitlistRequest>();
  });

  it("registers one schema per named response", () => {
    expectTypeOf<keyof typeof responseSchemas>().toEqualTypeOf<ResponseName>();
    expectTypeOf<z.infer<(typeof responseSchemas)["deposit"]>>().toEqualTypeOf<
      ResponseTypes["deposit"]
    >();
  });

  it("rejects fractional cents and unknown codes in the config", () => {
    const config = {
      liveMarkets: ["AR"],
      minRecurringUsdCents: 25000,
      minDepositUsdCents: 10000,
      efxCapUsdCents: 1000000,
      railsByCountry: { AR: ["ar_usdc"], BR: [] },
      investmentWindowDay: 5,
      ibkrPortalUrl: "https://www.interactivebrokers.com/",
    };
    expect(appConfigSchema.safeParse(config).success).toBe(true);
    expect(appConfigSchema.safeParse({ ...config, minRecurringUsdCents: 250.5 }).success).toBe(
      false,
    );
    expect(appConfigSchema.safeParse({ ...config, liveMarkets: ["UY"] }).success).toBe(false);
  });

  it("accepts single and multi questions only, each with options", () => {
    const question = { id: "q", label: "Q", kind: "single", options: [{ value: "a", label: "A" }] };
    const parse = (q: object) =>
      questionnaireSchema.safeParse({ version: "1", questions: [q] }).success;
    expect(parse(question)).toBe(true);
    expect(parse({ ...question, kind: "multi" })).toBe(true);
    expect(parse({ ...question, kind: "number" })).toBe(false);
    expect(parse({ ...question, options: [] })).toBe(false);
    expect(parse({ id: "q", label: "Q", kind: "single" })).toBe(false);
  });

  it("rejects an unknown account status", () => {
    const me = {
      id: "u1",
      name: "Lucía Fernández",
      email: "lucia@example.com",
      country: "AR",
      locale: "es",
      accountStatus: "open",
    };
    expect(meSchema.safeParse(me).success).toBe(true);
    expect(meSchema.safeParse({ ...me, accountStatus: "approved" }).success).toBe(false);
  });

  it("rejects fractional cents, unknown states and non-ISO dates in a deposit", () => {
    expect(depositSchema.safeParse(deposit).success).toBe(true);
    expect(depositSchema.safeParse({ ...deposit, amountCents: 10.5 }).success).toBe(false);
    expect(depositSchema.safeParse({ ...deposit, state: "pending" }).success).toBe(false);
    expect(depositSchema.safeParse({ ...deposit, createdAt: "27/10/2026" }).success).toBe(false);
  });

  it("accepts only Irish UCITS ISINs and whole shares", () => {
    expect(positionSchema.safeParse(position).success).toBe(true);
    expect(positionSchema.safeParse({ ...position, isin: "US78462F1030" }).success).toBe(false);
    expect(positionSchema.safeParse({ ...position, shares: 1.5 }).success).toBe(false);
  });

  it("limits plans to days 1–28 and requires a rail", () => {
    const plan = { amountCents: 25000, dayOfMonth: 5, rail: "ar_usdc" };
    expect(createPlanRequestSchema.safeParse(plan).success).toBe(true);
    expect(createPlanRequestSchema.safeParse({ ...plan, dayOfMonth: 29 }).success).toBe(false);
    expect(createPlanRequestSchema.safeParse({ ...plan, dayOfMonth: 0 }).success).toBe(false);
    expect(createPlanRequestSchema.safeParse({ amountCents: 25000, dayOfMonth: 5 }).success).toBe(
      false,
    );
  });

  it("rejects an unknown onboarding step", () => {
    expect(onboardingDraftSchema.safeParse({ currentStep: "personal", steps: {} }).success).toBe(
      true,
    );
    expect(onboardingDraftSchema.safeParse({ currentStep: "selfie", steps: {} }).success).toBe(
      false,
    );
  });
});
