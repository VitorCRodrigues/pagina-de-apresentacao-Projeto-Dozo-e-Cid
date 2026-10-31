import { delay, http, HttpResponse } from "msw";
import { userEvent, within } from "storybook/test";
import { lucia } from "@/mocks/fixtures";
import type { ScenarioId } from "@/mocks/scenarios";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Deposits", parameters: { frame: false } });

const detail = (scenario: ScenarioId) => (
  <StoryApp path="/aportar/dep-scenario" scenario={scenario} />
);

// Walks T6 up to the cost preview.
async function toPreview(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(await canvas.findByLabelText("Valor en dólares"), "500");
  await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  // Wait for the rail step itself: the amount step's Continuar is still on screen meanwhile.
  await canvas.findByRole("heading", { name: "¿Cómo vas a enviar el dinero?" });
  await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  await canvas.findByRole("button", { name: "Confirmar aporte" });
}

// --- The tab ---

export const TabInProgress = meta.story({
  render: () => <StoryApp path="/aportar" scenario="deposit_notified" />,
});

export const TabEmpty = meta.story({
  render: () => <StoryApp path="/aportar" scenario="empty" />,
});

// --- T6 ---

export const Amount = meta.story({ render: () => <StoryApp path="/aportar/nuevo" /> });

export const AmountBelowMinimum = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Valor en dólares"), "50");
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  },
});

export const Rail = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Valor en dólares"), "500");
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  },
});

export const Preview = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" />,
  play: async ({ canvasElement }) => {
    await toPreview(canvasElement);
  },
});

export const PreviewConfirming = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.post("/api/v1/deposits", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/aportar/nuevo" />,
  play: async ({ canvasElement }) => {
    await toPreview(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Confirmar aporte" }));
  },
});

// --- One story per BlockReason ---

export const BlockIbkrNotOpen = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/account", () =>
        HttpResponse.json({ status: "open", pending: [], blockReasons: ["ibkr_not_open"] }),
      ),
    );
  },
  render: () => <StoryApp path="/aportar/nuevo" />,
});

export const BlockIbkrRestricted = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" scenario="ibkr_restricted" />,
});

export const BlockComplianceHold = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" scenario="compliance_hold" />,
});

// Outside liveMarkets the whole app is the T1 waitlist, before any deposit screen.
export const BlockMarketNotLive = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" scenario="market_not_live" />,
});

// The server refuses the quote on confirm (409): the preview comes back as expired.
export const BlockQuoteExpired = meta.story({
  render: () => <StoryApp path="/aportar/nuevo" scenario="quote_expired" />,
  play: async ({ canvasElement }) => {
    await toPreview(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Confirmar aporte" }));
  },
});

export const BlockPixMedHold = meta.story({ render: () => detail("pix_med_hold") });

// --- T8: one story per DepositState ---

// Written out one by one: Storybook indexes only direct meta.story() calls.
export const StateKycPassed = meta.story({ render: () => detail("kyc_passed") });
export const StateIbkrOpen = meta.story({ render: () => detail("ibkr_open") });
export const StateDepositNotified = meta.story({ render: () => detail("deposit_notified") });
export const StatePartnerCollected = meta.story({ render: () => detail("partner_collected") });
export const StateFxExecuted = meta.story({ render: () => detail("fx_executed") });
export const StateWireSent = meta.story({ render: () => detail("wire_sent") });
export const StateBrokerCredited = meta.story({ render: () => detail("broker_credited") });
export const StateInvested = meta.story({ render: () => detail("invested") });
export const StateReturned = meta.story({ render: () => detail("returned") });

// --- T7 variants and edge cases ---

export const FirstDepositUsdcWithMemo = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/deposits/dep-scenario", () => HttpResponse.json(firstUsdc)));
  },
  render: () => detail("deposit_notified"),
});

export const WireInstructions = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/deposits/dep-scenario", () => HttpResponse.json(wireDeposit)));
  },
  render: () => detail("deposit_notified"),
});

export const InstructionsBlockedWhileRestricted = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/me", () => HttpResponse.json({ ...lucia, accountStatus: "restricted" })),
    );
  },
  render: () => detail("deposit_notified"),
});

export const Overdue = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/deposits/dep-scenario", () =>
        HttpResponse.json({
          ...wireDeposit,
          state: "fx_executed",
          expectedBy: "2026-10-01T00:00:00Z",
        }),
      ),
    );
  },
  render: () => detail("fx_executed"),
});

export const NotFound = meta.story({
  render: () => <StoryApp path="/aportar/dep-nope" />,
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/deposits/dep-scenario", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => detail("deposit_notified"),
});

const history = [{ state: "deposit_notified", at: "2026-10-31T12:00:00Z" }];

const firstUsdc = {
  id: "dep-scenario",
  rail: "ar_usdc",
  state: "deposit_notified",
  amountCents: 50000,
  costs: [{ kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false }],
  history,
  createdAt: "2026-10-31T12:00:00Z",
  isFirstDeposit: true,
  expectedBy: "2099-01-01T00:00:00Z",
  instructions: {
    type: "usdc",
    token: "USDC",
    network: "Ethereum (ERC-20)",
    address: "0x52908400098527886E0F7030069857D2E4169EE7",
    memo: "4821",
    scope: "account",
  },
};

const wireDeposit = {
  ...firstUsdc,
  rail: "ar_swift",
  isFirstDeposit: false,
  amountCents: 100000,
  instructions: {
    type: "wire",
    beneficiaryName: "Lucía Fernández",
    accountNumber: "U****4821",
    bankName: "Citibank N.A., New York",
    swiftBic: "CITIUS33",
    reference: "OD-DEP-SCENARIO",
    scope: "deposit",
  },
};
