import { describe, expect, it } from "vitest";
import type {
  ApiErrorBody,
  DepositDetail,
  DepositsPage,
  NotificationPrefs,
  OnboardingDraft,
  Questionnaire,
  TermsDocument,
} from "@/api/proposed-types";
import type { Account, Locale, Me, Plan, Portfolio, Quote } from "@/api/types";
import { getMockDb } from "./mock-store";
import type { ScenarioId } from "./scenarios";
import { setScenario } from "./scenario-state";

interface CallOptions {
  body?: unknown;
  key?: string;
  lang?: Locale;
  token?: boolean;
}

// Raw fetch against the MSW server; the body is cast to what the test expects to read.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the caller names the body type
async function call<T = ApiErrorBody>(method: string, path: string, options: CallOptions = {}) {
  const { body, key, lang = "es", token = true } = options;
  const headers = new Headers({ "Accept-Language": lang });
  if (token) headers.set("Authorization", "Bearer test");
  if (key) headers.set("Idempotency-Key", key);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, json: (text ? JSON.parse(text) : null) as T };
}

function scenario(id: ScenarioId) {
  setScenario(id);
}

async function quote(amountCents = 50000) {
  return (await call<Quote>("POST", "/deposits/quote", { body: { amountCents } })).json;
}

describe("mock API handlers", () => {
  it("rejects requests without a token with 401 session_expired", async () => {
    const response = await call("GET", "/account", { token: false });
    expect(response.status).toBe(401);
    expect(response.json.error.code).toBe("session_expired");
  });

  it("answers editorial content in the requested language", async () => {
    const es = await call<Portfolio>("GET", "/portfolio", { lang: "es" });
    const pt = await call<Portfolio>("GET", "/portfolio", { lang: "pt" });
    expect(es.json.positions[0]?.description).toMatch(/Sigue al S&P 500/);
    expect(pt.json.positions[0]?.description).toMatch(/Acompanha o S&P 500/);
  });

  it("quotes the AR rails with integer costs and a 5-minute expiry", async () => {
    const response = await call<Quote>("POST", "/deposits/quote", { body: { amountCents: 50000 } });
    expect(response.status).toBe(200);
    const usdc = response.json.options.find((o) => o.rail === "ar_usdc");
    expect(usdc).toMatchObject({ recommended: true, totalCostCents: 150, netToInvestCents: 49850 });
    expect(response.json.options.map((o) => o.rail)).toEqual(["ar_usdc", "ar_swift"]);
    const ttl = Date.parse(response.json.expiresAt) - Date.now();
    expect(ttl).toBeGreaterThan(290_000);
    expect(ttl).toBeLessThanOrEqual(300_000);
  });

  it("refuses a quote below the one-off minimum", async () => {
    const response = await call("POST", "/deposits/quote", { body: { amountCents: 9999 } });
    expect(response.status).toBe(422);
    expect(response.json.error.code).toBe("below_minimum");
  });

  it("returns the same deposit for a repeated Idempotency-Key", async () => {
    const { id: quoteId } = await quote();
    const body = { quoteId, rail: "ar_usdc" };
    const first = await call<DepositDetail>("POST", "/deposits", { body, key: "k-1" });
    const again = await call<DepositDetail>("POST", "/deposits", { body, key: "k-1" });

    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.json.id).toBe(first.json.id);
    expect(first.json).toMatchObject({ state: "deposit_notified", isFirstDeposit: false });
    expect(first.json.instructions).toMatchObject({ type: "usdc", token: "USDC" });

    const list = await call<DepositsPage>("GET", "/deposits");
    expect(list.json.items.filter((d) => d.id === first.json.id)).toHaveLength(1);
  });

  it("rejects a reused key with a different body with 409 idempotency_conflict", async () => {
    const { id: quoteId } = await quote();
    await call("POST", "/deposits", { body: { quoteId, rail: "ar_usdc" }, key: "k-2" });
    const conflict = await call("POST", "/deposits", {
      body: { quoteId, rail: "ar_swift" },
      key: "k-2",
    });
    expect(conflict.status).toBe(409);
    expect(conflict.json.error.code).toBe("idempotency_conflict");
  });

  it("requires an Idempotency-Key to create a deposit", async () => {
    const { id: quoteId } = await quote();
    const response = await call("POST", "/deposits", { body: { quoteId, rail: "ar_usdc" } });
    expect(response.status).toBe(422);
    expect(response.json.error.code).toBe("validation_failed");
  });

  it("quote_expired scenario: POST /deposits answers 409 quote_expired", async () => {
    scenario("quote_expired");
    const { id: quoteId } = await quote();
    const response = await call("POST", "/deposits", {
      body: { quoteId, rail: "ar_usdc" },
      key: "k-3",
    });
    expect(response.status).toBe(409);
    expect(response.json.error.code).toBe("quote_expired");
  });

  it("compliance_hold scenario: POST /deposits/quote answers 409 compliance_hold", async () => {
    scenario("compliance_hold");
    const response = await call("POST", "/deposits/quote", { body: { amountCents: 50000 } });
    expect(response.status).toBe(409);
    expect(response.json.error.code).toBe("compliance_hold");
  });

  it("blocks deposits before the account opens and while restricted", async () => {
    const request = { body: { amountCents: 50000 } };
    scenario("ibkr_pending");
    expect((await call("POST", "/deposits/quote", request)).json.error.code).toBe(
      "account_not_open",
    );
    scenario("restricted");
    expect((await call("POST", "/deposits/quote", request)).json.error.code).toBe(
      "account_restricted",
    );
  });

  it("server_error scenario: every route answers 500 internal", async () => {
    scenario("server_error");
    for (const path of ["/config", "/me", "/account", "/portfolio", "/deposits", "/plans"]) {
      const response = await call("GET", path);
      expect(response.status, path).toBe(500);
      expect(response.json.error.code, path).toBe("internal");
    }
  });

  it("empty scenario: deposits, plans and positions are empty", async () => {
    scenario("empty");
    expect((await call<DepositsPage>("GET", "/deposits")).json.items).toEqual([]);
    expect((await call<Plan[]>("GET", "/plans")).json).toEqual([]);
    expect((await call<Portfolio>("GET", "/portfolio")).json.positions).toEqual([]);
  });

  it("slow scenario: the db adds 3000 ms to every response", () => {
    scenario("slow");
    expect(getMockDb().latencyMs).toBe(3000);
  });

  it("validates plans: minimum 25000, day 1–28, rail required", async () => {
    const below = await call("POST", "/plans", {
      body: { amountCents: 24999, dayOfMonth: 5, rail: "ar_usdc" },
      key: "p-1",
    });
    expect(below.status).toBe(422);
    expect(below.json.error.code).toBe("below_minimum");

    const day29 = await call("POST", "/plans", {
      body: { amountCents: 25000, dayOfMonth: 29, rail: "ar_usdc" },
      key: "p-2",
    });
    expect(day29.json.error).toMatchObject({
      code: "validation_failed",
      fields: { dayOfMonth: "invalid" },
    });

    const noRail = await call("POST", "/plans", {
      body: { amountCents: 25000, dayOfMonth: 5 },
      key: "p-3",
    });
    expect(noRail.json.error).toMatchObject({
      code: "validation_failed",
      fields: { rail: "invalid" },
    });

    const created = await call<Plan>("POST", "/plans", {
      body: { amountCents: 25000, dayOfMonth: 28, rail: "ar_swift" },
      key: "p-4",
    });
    expect(created.status).toBe(201);
    const paused = await call<Plan>("PATCH", `/plans/${created.json.id}`, {
      body: { status: "paused" },
    });
    expect(paused.json.status).toBe("paused");
  });

  it("filters and paginates GET /deposits", async () => {
    scenario("returned");
    const returned = await call<DepositsPage>("GET", "/deposits?state=returned");
    expect(returned.json.items.map((d) => d.state)).toEqual(["returned"]);

    const first = await call<DepositsPage>("GET", "/deposits?limit=2");
    expect(first.json.items).toHaveLength(2);
    expect(first.json.nextCursor).toBeTruthy();
    const second = await call<DepositsPage>(
      "GET",
      `/deposits?limit=2&cursor=${first.json.nextCursor ?? ""}`,
    );
    expect(second.json.items).toHaveLength(2);
    expect(second.json.nextCursor).toBeUndefined();
  });

  it("answers 404 not_found for an unknown deposit", async () => {
    const response = await call("GET", "/deposits/nope");
    expect(response.status).toBe(404);
    expect(response.json.error.code).toBe("not_found");
  });

  it("serves the api-gaps.md routes", async () => {
    expect((await call("POST", "/deposits/dep-2026-10/sent-notice")).status).toBe(204);
    expect((await call<NotificationPrefs>("GET", "/me/notifications")).json).toEqual({
      email: true,
      push: false,
    });
    const patched = await call<NotificationPrefs>("PATCH", "/me/notifications", {
      body: { push: true },
    });
    expect(patched.json).toEqual({ email: true, push: true });
    const terms = await call<TermsDocument[]>("GET", "/account/terms", { lang: "en" });
    expect(terms.json.map((t) => t.title)).toContain("Advisory agreement");
    expect((await call("POST", "/account/terms/terms-privacy/accept")).status).toBe(204);
    expect((await call("POST", "/auth/logout", { token: false })).status).toBe(204);
  });

  it("saves onboarding steps and submits the application", async () => {
    scenario("draft");
    const saved = await call<OnboardingDraft>("PUT", "/onboarding/address", {
      body: { street: "Av. Santa Fe 1000", city: "Buenos Aires", postalCode: "C1059" },
    });
    expect(saved.json.steps.address?.street).toBe("Av. Santa Fe 1000");
    expect((await call("PUT", "/onboarding/selfie", { body: {} })).status).toBe(422);

    const questions = await call<Questionnaire>("GET", "/onboarding/questionnaire", { lang: "pt" });
    expect(questions.json.questions[0]?.label).toBe("Para que você vai usar este dinheiro?");

    const submitted = await call<Account>("POST", "/onboarding/submit");
    expect(submitted.json.status).toBe("submitted");
    expect((await call<Me>("GET", "/me")).json.accountStatus).toBe("submitted");
  });

  it("advances currentStep to the first unsaved step and never moves it back", async () => {
    scenario("draft");
    const saved = await call<OnboardingDraft>("PUT", "/onboarding/address", { body: {} });
    expect(saved.json.currentStep).toBe("suitability");
    const edited = await call<OnboardingDraft>("PUT", "/onboarding/residence", {
      body: { country: "AR", nationality: "AR" },
    });
    expect(edited.json.currentStep).toBe("suitability");
    const review = await call<OnboardingDraft>("PUT", "/onboarding/review", { body: {} });
    expect(review.json.currentStep).toBe("review");
  });

  it("serves income and net worth as closed single-choice brackets", async () => {
    const { json } = await call<Questionnaire>("GET", "/onboarding/questionnaire");
    const kinds = new Set(json.questions.map((q) => q.kind));
    expect([...kinds].sort()).toEqual(["multi", "single"]);
    for (const id of ["income", "netWorth"]) {
      const question = json.questions.find((q) => q.id === id);
      expect(question?.kind).toBe("single");
      expect(question?.options.length).toBeGreaterThan(2);
    }
  });

  it("puts any ISO country on the waitlist", async () => {
    const ok = await call("POST", "/waitlist", { body: { email: "a@b.co", country: "UY" } });
    expect(ok.status).toBe(204);
    const bad = await call("POST", "/waitlist", { body: { email: "a@b.co", country: "uru" } });
    expect(bad.status).toBe(422);
  });
});
