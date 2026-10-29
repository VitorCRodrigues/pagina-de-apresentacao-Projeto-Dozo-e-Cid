import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { onboardingSteps, type OnboardingStep } from "@/api/proposed-types";
import {
  createDepositRequestSchema,
  createPlanRequestSchema,
  depositStateSchema,
  notificationPrefsSchema,
  quoteRequestSchema,
  updatePlanRequestSchema,
  waitlistRequestSchema,
} from "@/api/schemas";
import type { Locale, Quote, RailOption } from "@/api/types";
import { asLocale } from "@/lib/locale";
import { sumCents } from "@/lib/money";
import {
  accountPayload,
  costsFor,
  depositPayload,
  newDepositFromQuote,
  notificationsPayload,
  portfolioPayload,
  questionnairePayload,
  termsPayload,
  type MockDb,
} from "./db";
import { getMockDb } from "./mock-store";

const api = (path: string) => `/api/v1${path}`;

function errorResponse(status: number, code: string, message: string, extra: object = {}) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status });
}

const notFound = () => errorResponse(404, "not_found", "Not found");

// Zod issues → { field: "invalid" }, the shape api-gaps.md proposes for error.fields.
function invalid(issues: readonly { path: readonly PropertyKey[] }[]) {
  const fields = Object.fromEntries(issues.map((issue) => [String(issue.path[0]), "invalid"]));
  return errorResponse(422, "validation_failed", "Invalid request body", { fields });
}

const lang = (request: Request): Locale =>
  asLocale(request.headers.get("Accept-Language") ?? undefined);

const readJson = (request: Request): Promise<unknown> => request.json().catch(() => null);

// Latency, scenario-wide failures and the bearer check, shared by every route.
async function prepare(request: Request, getDb: () => MockDb, needsAuth = true) {
  const db = getDb();
  if (db.latencyMs > 0) await delay(db.latencyMs);
  if (db.failure) {
    const { status, code, until } = db.failure;
    return errorResponse(status, code, `Mock ${code}`, until ? { until } : {});
  }
  if (needsAuth && !request.headers.get("Authorization")?.startsWith("Bearer ")) {
    return errorResponse(401, "session_expired", "Missing or expired bearer token");
  }
  return db;
}

// Deposits and plans need a live country and an opened, unrestricted account.
function refuseFunding(db: MockDb) {
  if (!db.config.liveMarkets.includes(db.me.country)) {
    return errorResponse(403, "market_not_live", "Country not live");
  }
  if (db.account.status === "restricted") {
    return errorResponse(409, "account_restricted", "Account restricted");
  }
  if (db.account.status !== "open")
    return errorResponse(409, "account_not_open", "Account not open");
  return null;
}

function railOptions(db: MockDb, amountCents: number): RailOption[] {
  return db.config.railsByCountry[db.me.country].map((rail) => {
    const costs = costsFor(rail, amountCents);
    const totalCostCents = sumCents(costs.map((c) => c.amountCents));
    return {
      rail,
      recommended: rail === "ar_usdc",
      costs,
      totalCostCents,
      netToInvestCents: amountCents - totalCostCents,
      expectedDays: rail === "ar_usdc" ? { min: 0, max: 1 } : { min: 1, max: 3 },
    };
  });
}

// PRD section 8 contract plus the docs/api-gaps.md proposals.
// The pending item id and whether a file came along. Browsers and Node parse multipart with
// formData(); jsdom's XMLHttpRequest sends a body undici refuses to parse, so tests fall back
// to reading the parts as text.
async function readUpload(request: Request): Promise<{ itemId: string | null; hasFile: boolean }> {
  const copy = request.clone();
  try {
    const form = await request.formData();
    const itemId = form.get("pendingItemId");
    const file = form.get("file");
    return {
      itemId: typeof itemId === "string" ? itemId : null,
      hasFile: file !== null && typeof file !== "string",
    };
  } catch {
    const body = await copy.text();
    const itemId = /name="pendingItemId"\r?\n\r?\n([^\r\n]+)/.exec(body)?.[1] ?? null;
    return { itemId, hasFile: /name="file"; filename="/.test(body) };
  }
}

export function createHandlers(getDb: () => MockDb) {
  return [
    http.get(api("/health"), () => HttpResponse.json({ status: "ok" })),

    http.get(api("/config"), async ({ request }) => {
      const db = await prepare(request, getDb, false);
      return db instanceof Response ? db : HttpResponse.json(db.config);
    }),

    http.get(api("/me"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(db.me);
    }),

    // --- Onboarding (T2) ---

    http.get(api("/onboarding"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(db.onboarding);
    }),

    http.get(api("/onboarding/questionnaire"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response
        ? db
        : HttpResponse.json(questionnairePayload(db, lang(request)));
    }),

    http.put(api("/onboarding/:step"), async ({ request, params }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const step = String(params.step);
      if (!(onboardingSteps as readonly string[]).includes(step)) {
        return errorResponse(422, "validation_failed", "Unknown step", {
          fields: { step: "invalid" },
        });
      }
      const body = await readJson(request);
      if (typeof body !== "object" || body === null) return invalid([{ path: ["body"] }]);
      // currentStep is the first unsaved step; editing an earlier one never moves it back.
      const saved = onboardingSteps.indexOf(step as OnboardingStep);
      const current = onboardingSteps.indexOf(db.onboarding.currentStep);
      const next = Math.min(saved + 1, onboardingSteps.length - 1);
      db.onboarding = {
        currentStep: onboardingSteps[Math.max(current, next)] ?? "review",
        steps: { ...db.onboarding.steps, [step]: body as Record<string, unknown> },
      };
      return HttpResponse.json(db.onboarding);
    }),

    http.post(api("/onboarding/submit"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      if (db.account.status !== "draft") {
        return errorResponse(422, "validation_failed", "Already submitted");
      }
      db.account = { ...db.account, status: "submitted" };
      db.me = { ...db.me, accountStatus: "submitted" };
      return HttpResponse.json(accountPayload(db, lang(request)));
    }),

    // --- Account (T3, T11, T12) ---

    http.get(api("/account"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(accountPayload(db, lang(request)));
    }),

    http.post(api("/account/documents"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const { itemId, hasFile } = await readUpload(request);
      if (!itemId || !hasFile) {
        return errorResponse(422, "validation_failed", "pendingItemId and file are required");
      }
      const exists = db.account.pending.some((item) => item.id === itemId);
      if (!exists) return notFound();
      db.account = {
        ...db.account,
        pending: db.account.pending.filter((item) => item.id !== itemId),
      };
      return HttpResponse.json(accountPayload(db, lang(request)));
    }),

    http.get(api("/account/terms"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(termsPayload(db, lang(request)));
    }),

    http.post(api("/account/terms/:id/accept"), async ({ request, params }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const id = String(params.id);
      if (!termsPayload(db, "es").some((doc) => doc.id === id)) return notFound();
      db.acceptedTerms[id] = new Date().toISOString();
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(api("/notifications"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response
        ? db
        : HttpResponse.json(notificationsPayload(db, lang(request)));
    }),

    http.get(api("/me/notifications"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(db.prefs);
    }),

    http.patch(api("/me/notifications"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const parsed = notificationPrefsSchema.partial().safeParse(await readJson(request));
      if (!parsed.success) return invalid(parsed.error.issues);
      db.prefs = { ...db.prefs, ...parsed.data };
      return HttpResponse.json(db.prefs);
    }),

    // --- Portfolio (T4, T9) ---

    http.get(api("/portfolio"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(portfolioPayload(db, lang(request)));
    }),

    // --- Plans (T5) ---

    http.get(api("/plans"), async ({ request }) => {
      const db = await prepare(request, getDb);
      return db instanceof Response ? db : HttpResponse.json(db.plans);
    }),

    http.post(api("/plans"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const key = request.headers.get("Idempotency-Key");
      if (!key) return invalid([{ path: ["Idempotency-Key"] }]);
      const refusal = refuseFunding(db);
      if (refusal) return refusal;

      const raw = await readJson(request);
      const parsed = createPlanRequestSchema.safeParse(raw);
      if (!parsed.success) return invalid(parsed.error.issues);
      if (parsed.data.amountCents < db.config.minRecurringUsdCents) {
        return errorResponse(422, "below_minimum", "Below the monthly minimum");
      }
      if (!db.config.railsByCountry[db.me.country].includes(parsed.data.rail)) {
        return invalid([{ path: ["rail"] }]);
      }

      const body = JSON.stringify(parsed.data);
      const previous = db.plansByKey.get(key);
      if (previous) {
        if (previous.body !== body) return errorResponse(409, "idempotency_conflict", "Key reused");
        return HttpResponse.json(db.plans.find((p) => p.id === previous.planId));
      }
      const plan = {
        id: `plan-${crypto.randomUUID().slice(0, 8)}`,
        status: "active" as const,
        ...parsed.data,
      };
      db.plans = [...db.plans, plan];
      db.plansByKey.set(key, { body, planId: plan.id });
      return HttpResponse.json(plan, { status: 201 });
    }),

    http.patch(api("/plans/:id"), async ({ request, params }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const plan = db.plans.find((p) => p.id === params.id);
      if (!plan) return notFound();
      const parsed = updatePlanRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) return invalid(parsed.error.issues);
      if (
        parsed.data.amountCents !== undefined &&
        parsed.data.amountCents < db.config.minRecurringUsdCents
      ) {
        return errorResponse(422, "below_minimum", "Below the monthly minimum");
      }
      const updated = { ...plan, ...parsed.data };
      db.plans = db.plans.map((p) => (p.id === plan.id ? updated : p));
      return HttpResponse.json(updated);
    }),

    // --- Deposits (T6, T7, T8, T10) ---

    http.post(api("/deposits/quote"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const refusal = refuseFunding(db);
      if (refusal) return refusal;
      if (db.quoteRefusal) return errorResponse(409, db.quoteRefusal, "Deposits on hold");

      const parsed = quoteRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) return invalid(parsed.error.issues);
      if (parsed.data.amountCents < db.config.minDepositUsdCents) {
        return errorResponse(422, "below_minimum", "Below the one-off minimum");
      }
      const quote: Quote = {
        id: `q-${crypto.randomUUID().slice(0, 8)}`,
        amountCents: parsed.data.amountCents,
        options: railOptions(db, parsed.data.amountCents),
        expiresAt: new Date(Date.now() + db.quoteTtlSeconds * 1000).toISOString(),
      };
      db.quotes.set(quote.id, quote);
      return HttpResponse.json(quote);
    }),

    http.post(api("/deposits"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const key = request.headers.get("Idempotency-Key");
      if (!key) return invalid([{ path: ["Idempotency-Key"] }]);
      const refusal = refuseFunding(db);
      if (refusal) return refusal;

      const parsed = createDepositRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) return invalid(parsed.error.issues);

      // Same key: same answer, or a conflict if the body changed (PRD section 8).
      const body = JSON.stringify(parsed.data);
      const previous = db.depositsByKey.get(key);
      if (previous) {
        if (previous.body !== body) return errorResponse(409, "idempotency_conflict", "Key reused");
        const existing = db.deposits.find((d) => d.id === previous.depositId);
        return existing ? HttpResponse.json(depositPayload(existing, lang(request))) : notFound();
      }

      const quote = db.quotes.get(parsed.data.quoteId);
      if (db.depositRefusal || (quote && Date.parse(quote.expiresAt) <= Date.now())) {
        return errorResponse(409, "quote_expired", "Quote expired");
      }
      if (!quote) return notFound();
      if (!quote.options.some((o) => o.rail === parsed.data.rail)) {
        return invalid([{ path: ["rail"] }]);
      }

      const created = newDepositFromQuote(db, quote, parsed.data.rail, new Date());
      db.deposits = [created, ...db.deposits];
      db.depositsByKey.set(key, { body, depositId: created.id });
      return HttpResponse.json(depositPayload(created, lang(request)), { status: 201 });
    }),

    http.get(api("/deposits"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const url = new URL(request.url);
      const state = depositStateSchema.safeParse(url.searchParams.get("state"));
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const offset = Number(url.searchParams.get("cursor") ?? "0");
      const matching = state.success
        ? db.deposits.filter((d) => d.state === state.data)
        : db.deposits;
      const page = matching.slice(offset, offset + limit);
      const next = offset + limit < matching.length ? String(offset + limit) : undefined;
      return HttpResponse.json({
        items: page.map((d) => depositPayload(d, lang(request))),
        ...(next && { nextCursor: next }),
      });
    }),

    http.get(api("/deposits/:id"), async ({ request, params }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const found = db.deposits.find((d) => d.id === params.id);
      return found ? HttpResponse.json(depositPayload(found, lang(request))) : notFound();
    }),

    // "Ya envié": tells support only; the state does not change (PRD section 6).
    http.post(api("/deposits/:id/sent-notice"), async ({ request, params }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      return db.deposits.some((d) => d.id === params.id)
        ? new HttpResponse(null, { status: 204 })
        : notFound();
    }),

    // --- Session and waitlist ---

    http.post(api("/auth/logout"), () => new HttpResponse(null, { status: 204 })),

    http.post(api("/waitlist"), async ({ request }) => {
      const db = await prepare(request, getDb);
      if (db instanceof Response) return db;
      const parsed = waitlistRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) return invalid(parsed.error.issues);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export const handlers = createHandlers(getMockDb);
