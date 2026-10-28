import type {
  DepositDetail,
  Notification,
  NotificationPrefs,
  OnboardingDraft,
  Questionnaire,
  TermsDocument,
} from "@/api/proposed-types";
import { accountStatuses, blockReasons, depositStates } from "@/api/schemas";
import type {
  Account,
  AccountStatus,
  AppConfig,
  BlockReason,
  DepositState,
  Locale,
  Me,
  PendingItem,
  Plan,
  Portfolio,
  Position,
  Quote,
  Rail,
} from "@/api/types";
import { applyBasisPoints, sumCents } from "@/lib/money";
import {
  config,
  depositAction,
  documentRequests,
  etfs,
  lucia,
  luciaPersonal,
  questionnaire,
  rafael,
  returnReasons,
  termsDocuments,
  windowNotice,
  type Localized,
} from "./fixtures";
import type { ScenarioId } from "./scenarios";

// --- Stored shapes: API types with editorial strings kept in every language ---

export interface MockPendingItem extends Omit<PendingItem, "title" | "description"> {
  title: Localized;
  description: Localized;
}

export interface MockDeposit extends Omit<DepositDetail, "returnReason"> {
  returnReason?: Localized;
}

export interface MockPosition extends Omit<Position, "description"> {
  description: Localized;
}

export interface MockFailure {
  status: 500 | 503;
  code: "internal" | "maintenance";
  until?: string;
}

export interface MockDb {
  config: AppConfig;
  me: Me;
  account: Omit<Account, "pending"> & { pending: MockPendingItem[] };
  portfolio: Omit<Portfolio, "positions"> & { positions: MockPosition[] };
  plans: Plan[];
  deposits: MockDeposit[];
  notices: (MockPendingItem & { createdAt: string })[];
  onboarding: OnboardingDraft;
  prefs: NotificationPrefs;
  acceptedTerms: Record<string, string>;
  latencyMs: number;
  failure: MockFailure | null;
  quoteTtlSeconds: number;
  // Route-level refusals the scenario forces (compliance_hold on quotes, quote_expired on create).
  quoteRefusal: "compliance_hold" | null;
  depositRefusal: "quote_expired" | null;
  quotes: Map<string, Quote>;
  depositsByKey: Map<string, { body: string; depositId: string }>;
  plansByKey: Map<string, { body: string; planId: string }>;
}

// --- Builders ---

const iso = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");
const daysFrom = (now: Date, days: number) => new Date(now.getTime() + days * 86_400_000);
const nextWindow = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, config.investmentWindowDay, 14));

// The order a deposit walks through (funding.ts advance()); returned can follow any later step.
const statePath: readonly DepositState[] = [
  "kyc_passed",
  "ibkr_open",
  "deposit_notified",
  "partner_collected",
  "fx_executed",
  "wire_sent",
  "broker_credited",
  "invested",
];

// Per api-gaps.md (item 8) a deposit's history starts at deposit_notified: kyc_passed and
// ibkr_open are account steps. Only the scenarios named after those two states show them.
function history(target: DepositState, start: Date) {
  const until = target === "returned" ? "partner_collected" : target;
  const from = statePath.indexOf(until) < statePath.indexOf("deposit_notified") ? 0 : 2;
  const steps = statePath.slice(from, statePath.indexOf(until) + 1);
  const at = (i: number) => iso(new Date(start.getTime() + i * 3_600_000));
  const events = steps.map((state, i) => ({ state, at: at(i) }));
  if (target === "returned") events.push({ state: "returned", at: at(steps.length) });
  return events;
}

const usdcInstructions = (): MockDeposit["instructions"] => ({
  type: "usdc",
  token: "USDC",
  network: "Ethereum (ERC-20)",
  address: "0x52908400098527886E0F7030069857D2E4169EE7",
  scope: "account",
});

const wireInstructions = (reference: string): MockDeposit["instructions"] => ({
  type: "wire",
  beneficiaryName: "Lucía Fernández",
  accountNumber: "U****4821",
  bankName: "Citibank N.A., New York",
  swiftBic: "CITIUS33",
  reference,
  scope: "deposit",
});

// Cost lines per rail. The ratio fields are display-only; amounts stay integer cents.
export function costsFor(rail: Rail, amountCents: number) {
  const allocation = {
    kind: "allocation_min" as const,
    label: "",
    amountCents: 0,
    percent: 0,
    // The pilot pays the IBKR allocation minimum on the client's behalf (PRD section 12).
    estimated: false,
  };
  if (rail === "ar_swift") {
    // Fixed bank fees, known only roughly in advance.
    const fee = 3500;
    return [
      {
        kind: "rail_fee" as const,
        label: "",
        amountCents: fee,
        percent: fee / amountCents,
        estimated: true,
      },
      allocation,
    ];
  }
  // USDC → USD inside IBKR via Zerohash: 0.30%, minimum US$1 (PRD section 3).
  const fee = Math.max(applyBasisPoints(amountCents, 30), 100);
  return [
    {
      kind: "rail_fee" as const,
      label: "",
      amountCents: fee,
      percent: fee / amountCents,
      estimated: false,
    },
    allocation,
  ];
}

function deposit(
  id: string,
  state: DepositState,
  rail: Rail,
  amountCents: number,
  start: Date,
  now: Date,
): MockDeposit {
  const costs = costsFor(rail, amountCents);
  const net = amountCents - sumCents(costs.map((c) => c.amountCents));
  const reached = (s: DepositState) => statePath.indexOf(state) >= statePath.indexOf(s);
  const open = state !== "invested" && state !== "returned";
  return {
    id,
    rail,
    state,
    amountCents,
    costs,
    history: history(state, start),
    createdAt: iso(start),
    isFirstDeposit: false,
    ...(open && reached("broker_credited") && { creditedCents: net }),
    ...(state === "invested" && { creditedCents: net, investedCents: net }),
    ...(open && { expectedBy: iso(daysFrom(now, 3)) }),
    ...(state === "broker_credited" && { nextInvestmentWindow: iso(nextWindow(now)) }),
    ...(state === "deposit_notified" && {
      instructions:
        rail === "ar_swift" ? wireInstructions(`OD-${id.toUpperCase()}`) : usdcInstructions(),
    }),
    ...(state === "returned" && { returnReason: returnReasons.thirdParty }),
  };
}

function pastDeposits(now: Date): MockDeposit[] {
  return [
    deposit("dep-2026-10", "invested", "ar_usdc", 50000, daysFrom(now, -26), now),
    deposit("dep-2026-09", "invested", "ar_usdc", 50000, daysFrom(now, -56), now),
    deposit("dep-2026-08", "invested", "ar_swift", 100000, daysFrom(now, -87), now),
  ];
}

function heldPositions(): MockPosition[] {
  const values = etfs.map((etf) => etf.shares * etf.priceCents);
  const invested = sumCents(values);
  return etfs.map((etf, i) => {
    const valueCents = values[i] ?? 0;
    return {
      isin: etf.isin,
      name: etf.name,
      shares: etf.shares,
      valueCents,
      weight: Math.round((valueCents / invested) * 1000) / 1000,
      targetWeight: etf.targetWeight,
      description: etf.description,
    };
  });
}

const CASH_CENTS = 31200;

function portfolio(
  positions: MockPosition[],
  cashCents: number,
  inFlightCents: number,
  now: Date,
): MockDb["portfolio"] {
  const investedCents = sumCents(positions.map((p) => p.valueCents));
  return {
    // decisions.md, item 15: invested + cash + in flight, without fees.
    totalCents: sumCents([investedCents, cashCents, inFlightCents]),
    buckets: {
      inFlightCents,
      ibkrCashCents: cashCents,
      investedCents,
      feesPaidCents: positions.length > 0 ? 450 : 0,
    },
    positions,
    // Daily reconciliation with the IBKR Flex statement (PRD T9).
    asOf: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6))),
  };
}

const isAccountStatus = (id: ScenarioId): id is AccountStatus =>
  (accountStatuses as readonly string[]).includes(id);
const isDepositState = (id: ScenarioId): id is DepositState =>
  (depositStates as readonly string[]).includes(id);
const isBlockReason = (id: ScenarioId): id is BlockReason =>
  (blockReasons as readonly string[]).includes(id);

const hasOpened = (status: AccountStatus) => status === "open" || status === "restricted";

function accountFor(status: AccountStatus): MockDb["account"] {
  const pending: MockPendingItem[] =
    status === "action_required"
      ? documentRequests.map((doc) => ({
          id: doc.id,
          kind: "document",
          title: doc.title,
          description: doc.description,
        }))
      : [];
  const blocks: BlockReason[] =
    status === "restricted" ? ["ibkr_restricted"] : hasOpened(status) ? [] : ["ibkr_not_open"];
  return {
    status,
    ...(hasOpened(status) && { ibkrAccountMasked: "U****4821" }),
    pending,
    blockReasons: blocks,
  };
}

function base(status: AccountStatus, now: Date): MockDb {
  const opened = hasOpened(status);
  return {
    config,
    me: { ...lucia, accountStatus: status },
    account: accountFor(status),
    portfolio: opened ? portfolio(heldPositions(), CASH_CENTS, 0, now) : portfolio([], 0, 0, now),
    plans: opened
      ? [
          {
            id: "plan-1",
            amountCents: 50000,
            dayOfMonth: 5,
            rail: "ar_usdc",
            status: "active",
            nextRunAt: iso(nextWindow(now)),
          },
        ]
      : [],
    deposits: opened ? pastDeposits(now) : [],
    notices: opened
      ? [
          {
            id: "notice-window",
            kind: "notice",
            ...windowNotice,
            createdAt: iso(daysFrom(now, -1)),
          },
        ]
      : [],
    onboarding: {
      currentStep: status === "draft" ? "address" : "review",
      steps: {
        residence: { country: "AR", nationality: "AR" },
        personal: { ...luciaPersonal },
        ...(status !== "draft" && {
          address: {
            street: "Av. Corrientes 1234, 5° B",
            city: "Buenos Aires",
            postalCode: "C1043",
          },
        }),
      },
    },
    prefs: { email: true, push: false },
    acceptedTerms: opened
      ? Object.fromEntries(termsDocuments.map((doc) => [doc.id, iso(daysFrom(now, -40))]))
      : {},
    latencyMs: 0,
    failure: null,
    quoteTtlSeconds: 300,
    quoteRefusal: null,
    depositRefusal: null,
    quotes: new Map(),
    depositsByKey: new Map(),
    plansByKey: new Map(),
  };
}

// Puts "dep-scenario" first, in the given state, and moves the money buckets to match.
function withScenarioDeposit(db: MockDb, state: DepositState, now: Date): MockDb {
  const rail: Rail = state === "fx_executed" || state === "wire_sent" ? "ar_swift" : "ar_usdc";
  const current: MockDeposit = {
    ...deposit("dep-scenario", state, rail, 50000, daysFrom(now, -1), now),
    isFirstDeposit: state === "deposit_notified",
  };
  const inFlight = ["partner_collected", "fx_executed", "wire_sent"].includes(state)
    ? current.amountCents
    : 0;
  const cash = CASH_CENTS + (state === "broker_credited" ? (current.creditedCents ?? 0) : 0);
  const waitingOnClient: MockPendingItem[] =
    state === "deposit_notified"
      ? [{ id: "pend-deposit", kind: "deposit_action", ...depositAction, depositId: current.id }]
      : [];
  return {
    ...db,
    deposits: [current, ...db.deposits],
    portfolio: portfolio(heldPositions(), cash, inFlight, now),
    account: { ...db.account, pending: [...db.account.pending, ...waitingOnClient] },
  };
}

function blockScenario(reason: BlockReason, now: Date): MockDb {
  switch (reason) {
    case "ibkr_not_open":
      return base("ibkr_pending", now);
    case "ibkr_restricted":
      return base("restricted", now);
    case "market_not_live":
      return { ...base("draft", now), me: rafael };
    case "compliance_hold": {
      const db = base("open", now);
      return {
        ...db,
        account: { ...db.account, blockReasons: ["compliance_hold"] },
        quoteRefusal: "compliance_hold",
      };
    }
    case "quote_expired":
      return { ...base("open", now), quoteTtlSeconds: 10, depositRefusal: "quote_expired" };
    case "pix_med_hold": {
      // Brazil only: meaningful once BR is in liveMarkets; kept so the hold UI can be built.
      const db = withScenarioDeposit(base("open", now), "partner_collected", now);
      const [held, ...rest] = db.deposits;
      return {
        ...db,
        account: { ...db.account, blockReasons: ["pix_med_hold"] },
        deposits: held ? [{ ...held, rail: "br_efx", blockReason: "pix_med_hold" }, ...rest] : rest,
      };
    }
  }
}

export function buildMockDb(id: ScenarioId, now: Date = new Date()): MockDb {
  if (isAccountStatus(id)) return base(id, now);
  if (isDepositState(id)) return withScenarioDeposit(base("open", now), id, now);
  if (isBlockReason(id)) return blockScenario(id, now);

  switch (id) {
    case "slow":
      return { ...base("open", now), latencyMs: 3000 };
    case "server_error":
      return { ...base("open", now), failure: { status: 500, code: "internal" } };
    case "maintenance":
      return {
        ...base("open", now),
        failure: {
          status: 503,
          code: "maintenance",
          until: iso(new Date(now.getTime() + 30 * 60_000)),
        },
      };
    case "empty":
      return {
        ...base("open", now),
        deposits: [],
        plans: [],
        notices: [],
        portfolio: portfolio([], 0, 0, now),
      };
  }
}

// --- Payloads: the API shape, in the language the request asked for ---

const pick = (text: Localized, lang: Locale) => text[lang];

function pendingPayload(item: MockPendingItem, lang: Locale): PendingItem {
  return { ...item, title: pick(item.title, lang), description: pick(item.description, lang) };
}

export function accountPayload(db: MockDb, lang: Locale): Account {
  return { ...db.account, pending: db.account.pending.map((item) => pendingPayload(item, lang)) };
}

export function portfolioPayload(db: MockDb, lang: Locale): Portfolio {
  return {
    ...db.portfolio,
    positions: db.portfolio.positions.map((p) => ({
      ...p,
      description: pick(p.description, lang),
    })),
  };
}

export function depositPayload(item: MockDeposit, lang: Locale): DepositDetail {
  const { returnReason, ...rest } = item;
  return { ...rest, ...(returnReason && { returnReason: pick(returnReason, lang) }) };
}

// Pending items (documents, deposits waiting on the client) plus general notices.
export function notificationsPayload(db: MockDb, lang: Locale): Notification[] {
  const pendingSince = db.deposits[0]?.createdAt ?? db.portfolio.asOf;
  return [
    ...db.account.pending.map((item) => ({
      ...pendingPayload(item, lang),
      createdAt: pendingSince,
    })),
    ...db.notices.map((notice) => ({
      ...pendingPayload(notice, lang),
      createdAt: notice.createdAt,
    })),
  ];
}

export function questionnairePayload(_db: MockDb, lang: Locale): Questionnaire {
  return {
    version: questionnaire.version,
    questions: questionnaire.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      label: pick(q.label, lang),
      ...(q.options && {
        options: q.options.map((o) => ({ value: o.value, label: pick(o.label, lang) })),
      }),
    })),
  };
}

export function termsPayload(db: MockDb, lang: Locale): TermsDocument[] {
  return termsDocuments.map((doc) => {
    const acceptedAt = db.acceptedTerms[doc.id];
    return {
      id: doc.id,
      kind: doc.kind,
      version: "2026-10",
      title: pick(doc.title, lang),
      // TODO(compliance): drafts; real documents pending legal review (PRD section 10).
      url: `#terms/${doc.kind}`,
      ...(acceptedAt && { acceptedAt }),
    };
  });
}

// POST /deposits: a new deposit waiting for the client's money, built from the accepted quote.
export function newDepositFromQuote(db: MockDb, quote: Quote, rail: Rail, now: Date): MockDeposit {
  const id = `dep-${crypto.randomUUID().slice(0, 8)}`;
  const option = quote.options.find((o) => o.rail === rail);
  return {
    ...deposit(id, "deposit_notified", rail, quote.amountCents, now, now),
    ...(option && { costs: option.costs }),
    isFirstDeposit: db.deposits.length === 0,
    quote: { id: quote.id, createdAt: iso(now) },
  };
}
