import { describe, expect, it } from "vitest";
import {
  accountSchema,
  accountStatuses,
  blockReasons,
  depositDetailSchema,
  depositStates,
  meSchema,
  notificationPrefsSchema,
  notificationSchema,
  onboardingDraftSchema,
  planSchema,
  portfolioSchema,
  questionnaireSchema,
  termsDocumentSchema,
} from "@/api/schemas";
import { supportedLocales } from "@/i18n";
import { isValidCuit } from "@/lib/cuit";
import {
  accountPayload,
  buildMockDb,
  depositPayload,
  notificationsPayload,
  portfolioPayload,
  questionnairePayload,
  termsPayload,
} from "./db";
import { scenarioGroups, scenarioIds } from "./scenarios";

const now = new Date("2026-10-28T12:00:00Z");

describe("mock scenarios", () => {
  it("has 27 unique scenarios: the 26 of the plan plus maintenance", () => {
    expect(scenarioIds).toHaveLength(27);
    expect(new Set(scenarioIds).size).toBe(27);
    expect(scenarioIds).toContain("maintenance");
  });

  it("groups every scenario exactly once", () => {
    const grouped = scenarioGroups.flatMap((group) => group.ids);
    expect([...grouped].sort()).toEqual([...scenarioIds].sort());
    expect(scenarioGroups.map((group) => group.group)).toEqual([
      "account",
      "deposit",
      "block",
      "network",
    ]);
  });

  it.each(scenarioIds)("%s builds payloads that pass the API schemas in every language", (id) => {
    const db = buildMockDb(id, now);
    expect(meSchema.safeParse(db.me).success).toBe(true);
    expect(onboardingDraftSchema.safeParse(db.onboarding).success).toBe(true);
    expect(notificationPrefsSchema.safeParse(db.prefs).success).toBe(true);
    for (const plan of db.plans) expect(planSchema.safeParse(plan).success).toBe(true);
    for (const lang of supportedLocales) {
      expect(accountSchema.safeParse(accountPayload(db, lang)).error).toBeUndefined();
      expect(portfolioSchema.safeParse(portfolioPayload(db, lang)).error).toBeUndefined();
      expect(questionnaireSchema.safeParse(questionnairePayload(db, lang)).error).toBeUndefined();
      for (const deposit of db.deposits) {
        expect(depositDetailSchema.safeParse(depositPayload(deposit, lang)).error).toBeUndefined();
      }
      for (const item of notificationsPayload(db, lang)) {
        expect(notificationSchema.safeParse(item).error).toBeUndefined();
      }
      for (const doc of termsPayload(db, lang)) {
        expect(termsDocumentSchema.safeParse(doc).error).toBeUndefined();
      }
    }
  });

  it.each(accountStatuses)("account scenario %s sets that status everywhere", (status) => {
    const db = buildMockDb(status, now);
    expect(db.me.accountStatus).toBe(status);
    expect(db.account.status).toBe(status);
  });

  it("only opened accounts have deposits and a funded portfolio", () => {
    for (const status of [
      "draft",
      "submitted",
      "kyc_review",
      "ibkr_pending",
      "rejected",
    ] as const) {
      const db = buildMockDb(status, now);
      expect(db.deposits).toEqual([]);
      expect(db.portfolio.totalCents).toBe(0);
      expect(db.account.blockReasons).toContain("ibkr_not_open");
    }
    expect(buildMockDb("action_required", now).account.pending.length).toBeGreaterThanOrEqual(2);
    expect(buildMockDb("restricted", now).account.blockReasons).toEqual(["ibkr_restricted"]);
  });

  it.each(depositStates)("deposit scenario %s puts dep-scenario in that state", (state) => {
    const db = buildMockDb(state, now);
    const [first] = db.deposits;
    expect(first?.id).toBe("dep-scenario");
    expect(first?.state).toBe(state);
    expect(first?.history.at(-1)?.state).toBe(state);
    expect(db.account.status).toBe("open");
  });

  it("uses SWIFT where USDC hides the state, and gives returned a reason in every language", () => {
    expect(buildMockDb("fx_executed", now).deposits[0]?.rail).toBe("ar_swift");
    expect(buildMockDb("wire_sent", now).deposits[0]?.rail).toBe("ar_swift");
    expect(buildMockDb("deposit_notified", now).deposits[0]?.rail).toBe("ar_usdc");
    expect(buildMockDb("deposit_notified", now).deposits[0]?.isFirstDeposit).toBe(true);
    expect(buildMockDb("deposit_notified", now).deposits[0]?.instructions?.type).toBe("usdc");
    const returned = buildMockDb("returned", now).deposits[0];
    for (const lang of supportedLocales) {
      expect(returned && depositPayload(returned, lang).returnReason).toBeTruthy();
    }
  });

  it.each(blockReasons.filter((r) => r !== "quote_expired" && r !== "market_not_live"))(
    "block scenario %s lists that reason on the account",
    (reason) => {
      expect(buildMockDb(reason, now).account.blockReasons).toContain(reason);
    },
  );

  it("market_not_live puts the client outside liveMarkets; quote_expired shortens the quote", () => {
    const db = buildMockDb("market_not_live", now);
    expect(db.config.liveMarkets).toEqual(["AR"]);
    expect(db.config.liveMarkets).not.toContain(db.me.country);
    expect(buildMockDb("quote_expired", now).quoteTtlSeconds).toBe(10);
    expect(buildMockDb("open", now).quoteTtlSeconds).toBe(300);
  });

  it("network scenarios: 3 s latency, 500 everywhere, an empty account", () => {
    expect(buildMockDb("slow", now).latencyMs).toBe(3000);
    expect(buildMockDb("server_error", now).failure).toMatchObject({
      status: 500,
      code: "internal",
    });
    const empty = buildMockDb("empty", now);
    expect(empty.account.status).toBe("open");
    expect(empty.deposits).toEqual([]);
    expect(empty.plans).toEqual([]);
    expect(empty.portfolio.positions).toEqual([]);
    expect(notificationsPayload(empty, "es")).toEqual([]);
  });

  it("portfolio total is invested + cash + in flight, without fees (decisions.md, item 15)", () => {
    for (const id of scenarioIds) {
      const { totalCents, buckets } = buildMockDb(id, now).portfolio;
      expect(totalCents).toBe(
        buckets.investedCents + buckets.ibkrCashCents + buckets.inFlightCents,
      );
    }
    const open = buildMockDb("open", now).portfolio;
    expect(open.positions.reduce((sum, p) => sum + p.valueCents, 0)).toBe(
      open.buckets.investedCents,
    );
  });

  it("uses Irish ISINs, whole shares and a valid CUIL for the fictitious client", () => {
    for (const position of buildMockDb("open", now).portfolio.positions) {
      expect(position.isin).toMatch(/^IE/);
      expect(Number.isInteger(position.shares)).toBe(true);
    }
    const personal = buildMockDb("draft", now).onboarding.steps.personal;
    expect(isValidCuit(String(personal?.cuil))).toBe(true);
  });
});
