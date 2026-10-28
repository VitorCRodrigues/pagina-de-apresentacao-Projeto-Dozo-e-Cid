import type { ApiClient } from "./client";
import type {
  CreateDepositRequest,
  CreatePlanRequest,
  OnboardingStep,
  QuoteRequest,
  UpdatePlanRequest,
  WaitlistRequest,
} from "./proposed-types";
import type { DepositState } from "./types";

// One function per route of PRD section 8 (plus the api-gaps.md ones screens already use).

export function getConfig(api: ApiClient) {
  return api.request("GET", "/config", { response: "config" });
}

export function getMe(api: ApiClient) {
  return api.request("GET", "/me", { response: "me" });
}

export function getOnboarding(api: ApiClient) {
  return api.request("GET", "/onboarding", { response: "onboarding" });
}

export function saveOnboardingStep(
  api: ApiClient,
  step: OnboardingStep,
  data: Record<string, unknown>,
) {
  return api.request("PUT", `/onboarding/${step}`, { body: data, response: "onboarding" });
}

export function getQuestionnaire(api: ApiClient) {
  return api.request("GET", "/onboarding/questionnaire", { response: "questionnaire" });
}

export function submitOnboarding(api: ApiClient) {
  return api.request("POST", "/onboarding/submit", { response: "account" });
}

export function getAccount(api: ApiClient) {
  return api.request("GET", "/account", { response: "account" });
}

export function uploadDocument(api: ApiClient, pendingItemId: string, file: File) {
  const formData = new FormData();
  formData.set("pendingItemId", pendingItemId);
  formData.set("file", file);
  return api.request("POST", "/account/documents", { formData, response: "account" });
}

export function getPortfolio(api: ApiClient) {
  return api.request("GET", "/portfolio", { response: "portfolio" });
}

export function getPlans(api: ApiClient) {
  return api.request("GET", "/plans", { response: "plans" });
}

export function createPlan(api: ApiClient, body: CreatePlanRequest, idempotencyKey: string) {
  return api.request("POST", "/plans", { body, idempotencyKey, response: "plan" });
}

export function updatePlan(api: ApiClient, id: string, body: UpdatePlanRequest) {
  return api.request("PATCH", `/plans/${encodeURIComponent(id)}`, { body, response: "plan" });
}

export function createQuote(api: ApiClient, body: QuoteRequest) {
  return api.request("POST", "/deposits/quote", { body, response: "quote" });
}

export function createDeposit(api: ApiClient, body: CreateDepositRequest, idempotencyKey: string) {
  return api.request("POST", "/deposits", { body, idempotencyKey, response: "deposit" });
}

export interface DepositsFilter {
  state?: DepositState;
  cursor?: string;
}

export function getDeposits(api: ApiClient, { state, cursor }: DepositsFilter = {}) {
  return api.request("GET", "/deposits", { query: { state, cursor }, response: "depositsPage" });
}

export function getDeposit(api: ApiClient, id: string) {
  return api.request("GET", `/deposits/${encodeURIComponent(id)}`, { response: "deposit" });
}

export function getNotifications(api: ApiClient) {
  return api.request("GET", "/notifications", { response: "notifications" });
}

// docs/api-gaps.md, item 1.
export function joinWaitlist(api: ApiClient, body: WaitlistRequest) {
  return api.request("POST", "/waitlist", { body });
}
