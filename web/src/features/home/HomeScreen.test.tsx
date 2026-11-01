import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

const portfolio = {
  totalCents: 201200,
  buckets: {
    investedCents: 120000,
    ibkrCashCents: 31200,
    inFlightCents: 50000,
    feesPaidCents: 450,
  },
  positions: [],
  asOf: "2026-10-31T06:00:00Z",
};

const deposit = (
  id: string,
  state: string,
  rail = "ar_usdc",
  createdAt = "2026-10-30T12:00:00Z",
) => ({
  id,
  rail,
  state,
  amountCents: 50000,
  costs: [],
  history: [{ state, at: createdAt }],
  createdAt,
  isFirstDeposit: false,
});

function serve({ plans, deposits }: { plans?: unknown[]; deposits?: unknown[] }) {
  server.use(http.get("/api/v1/portfolio", () => HttpResponse.json(portfolio)));
  if (plans) server.use(http.get("/api/v1/plans", () => HttpResponse.json(plans)));
  if (deposits)
    server.use(http.get("/api/v1/deposits", () => HttpResponse.json({ items: deposits })));
}

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/inicio", scenario });
  await screen.findByRole("heading", { level: 1, name: "Tu cuenta" }, { timeout: 4000 });
  return view;
}

const card = (name: string) => screen.findByRole("region", { name });

describe("home (T4)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-10T12:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the total, the split right below it and when it was last updated", async () => {
    serve({});
    await open();
    expect(await screen.findByText("US$ 2.012,00")).toBeInTheDocument();
    const split = screen.getByRole("list", { name: "Cómo se divide" });
    expect(split).toHaveTextContent(/Invertido\s*US\$ 1\.200,00/);
    expect(split).toHaveTextContent(/En caja\s*US\$ 312,00/);
    expect(split).toHaveTextContent(/En tránsito\s*US\$ 500,00/);
    // Date and time of the last reconciliation.
    expect(screen.getByText(/Actualizado el .*2026.*\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("the total is the only figure in Fraunces", async () => {
    serve({});
    await open();
    await screen.findByText("US$ 2.012,00");
    expect(document.querySelectorAll(".type-value-display")).toHaveLength(1);
  });

  it("next deposit: the active plan's date and amount", async () => {
    serve({
      plans: [
        {
          id: "plan-1",
          amountCents: 50000,
          dayOfMonth: 5,
          rail: "ar_usdc",
          status: "active",
          nextRunAt: "2026-11-05T14:00:00Z",
        },
      ],
    });
    await open();
    const next = await card("Próximo aporte");
    expect(await within(next).findByText("US$ 500,00")).toBeInTheDocument();
    expect(within(next).getByText(/El 5 nov 2026/)).toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "Ver plan" })).toHaveAttribute("href", "/plan");
  });

  it("next deposit: a way to create a plan when there is none, a note when paused", async () => {
    serve({ plans: [] });
    await open();
    const next = await card("Próximo aporte");
    expect(await within(next).findByText("Todavía no tenés un plan mensual.")).toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "Crear plan" })).toHaveAttribute("href", "/plan");
  });

  it("next deposit: paused plan", async () => {
    serve({
      plans: [{ id: "p", amountCents: 50000, dayOfMonth: 5, rail: "ar_usdc", status: "paused" }],
    });
    await open();
    const next = await card("Próximo aporte");
    expect(await within(next).findByText("Tu plan mensual está pausado.")).toBeInTheDocument();
  });

  it("next deposit: the same plan as the plan screen (the first one not cancelled)", async () => {
    serve({
      plans: [
        { id: "a", amountCents: 30000, dayOfMonth: 5, rail: "ar_usdc", status: "paused" },
        {
          id: "b",
          amountCents: 90000,
          dayOfMonth: 5,
          rail: "ar_usdc",
          status: "active",
          nextRunAt: "2026-11-05T14:00:00Z",
        },
      ],
    });
    await open();
    const next = await card("Próximo aporte");
    expect(await within(next).findByText("Tu plan mensual está pausado.")).toBeInTheDocument();
  });

  it("a negative total (cash owed for a fee) is never shown in gold", async () => {
    server.use(
      http.get("/api/v1/portfolio", () =>
        HttpResponse.json({
          totalCents: -500,
          buckets: { investedCents: 0, ibkrCashCents: -500, inFlightCents: 0, feesPaidCents: 0 },
          positions: [],
          asOf: "2026-10-31T06:00:00Z",
        }),
      ),
    );
    await open();
    expect(await screen.findByText(/^-\s?US\$\s?5,00$/, { selector: "p" })).toBeInTheDocument();
    expect(document.querySelector(".text-gold-500")).toBeNull();
  });

  it("deposits in progress: friendly state (USDC recibido), at most three, each opens T8", async () => {
    serve({
      deposits: [
        deposit("d1", "partner_collected", "ar_usdc", "2026-10-30T12:00:00Z"),
        deposit("d2", "deposit_notified", "ar_usdc", "2026-10-29T12:00:00Z"),
        deposit("d3", "wire_sent", "ar_swift", "2026-10-28T12:00:00Z"),
        deposit("d4", "broker_credited", "ar_swift", "2026-10-27T12:00:00Z"),
      ],
    });
    await open();
    const inProgress = await card("Aportes en curso");
    const links = await within(inProgress).findAllByRole("link", { name: /500,00/ });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent("USDC recibido");
    expect(links[0]).toHaveAttribute("href", "/aportar/d1");
    expect(within(inProgress).getByText("Y 1 más")).toBeInTheDocument();
    expect(within(inProgress).getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/aportar",
    );
    expect(inProgress).not.toHaveTextContent(/partner_collected|deposit_notified/);
  });

  it("deposits in progress: never an unknown or wrong count when more pages exist", async () => {
    server.use(http.get("/api/v1/portfolio", () => HttpResponse.json(portfolio)));
    server.use(
      http.get("/api/v1/deposits", () =>
        HttpResponse.json({
          items: [deposit("d1", "partner_collected"), deposit("d2", "deposit_notified")],
          nextCursor: "c2",
        }),
      ),
    );
    await open();
    const inProgress = await card("Aportes en curso");
    await within(inProgress).findAllByRole("link", { name: /500,00/ });
    expect(inProgress).not.toHaveTextContent(/Y -?\d+ más/);
    expect(within(inProgress).getByRole("link", { name: "Ver todos" })).toBeInTheDocument();
  });

  it("deposits in progress: none, with a way to start one", async () => {
    serve({ deposits: [] });
    await open();
    const inProgress = await card("Aportes en curso");
    expect(await within(inProgress).findByText("No tenés aportes en curso.")).toBeInTheDocument();
    expect(within(inProgress).getByRole("link", { name: "Hacer un aporte" })).toHaveAttribute(
      "href",
      "/aportar/nuevo",
    );
  });

  it("next window: the server's deposit date wins over the local calculation", async () => {
    serve({
      deposits: [
        { ...deposit("d1", "broker_credited"), nextInvestmentWindow: "2026-11-09T14:00:00Z" },
      ],
    });
    await open();
    const window = await card("Próxima ventana de inversión");
    expect(await within(window).findByText("9 nov 2026")).toBeInTheDocument();
  });

  it("next window: falls back to config.investmentWindowDay, date only", async () => {
    serve({ deposits: [] });
    await open();
    const window = await card("Próxima ventana de inversión");
    // Mock config: day 5; today is 10 October, so 5 November.
    expect(await within(window).findByText("5 nov 2026")).toBeInTheDocument();
    expect(window).not.toHaveTextContent(/\d{2}:\d{2}/);
  });

  it("pending strip only when there is something pending", async () => {
    server.use(
      http.get("/api/v1/account", () =>
        HttpResponse.json({
          status: "open",
          pending: [
            { id: "a", kind: "document", title: "x", description: "y" },
            { id: "b", kind: "terms", title: "x", description: "y" },
          ],
          blockReasons: [],
        }),
      ),
    );
    serve({});
    await open();
    expect(await screen.findByText("Tenés 2 pendientes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver pendientes" })).toHaveAttribute(
      "href",
      "/pendientes",
    );
  });

  it("no pending strip when there is nothing pending", async () => {
    serve({});
    await open();
    await screen.findByText("US$ 2.012,00");
    expect(screen.queryByText(/pendiente/)).not.toBeInTheDocument();
  });

  it("restricted account: the note and the way to support (decision 14)", async () => {
    await open("restricted");
    expect(await screen.findByText("Tu cuenta necesita atención.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hablar con soporte" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });

  it("only in transit: the whole balance is in transit", async () => {
    await open("in_flight_only");
    const split = await screen.findByRole("list", { name: "Cómo se divide" });
    expect(split).toHaveTextContent(/En tránsito\s*US\$ 500,00/);
    expect(split).toHaveTextContent(/Invertido\s*US\$ 0,00/);
  });

  it("zero balance: a neutral US$ 0,00, never the gold display figure", async () => {
    await open("empty");
    expect(await screen.findByText("US$ 0,00", { selector: "p" })).toBeInTheDocument();
    expect(document.querySelector(".type-value-display")).toBeNull();
    expect(document.querySelector(".text-gold-500")).toBeNull();
  });

  it("new client: one primary action, the first deposit, and no second link for it", async () => {
    await open("empty");
    const start = await screen.findByRole("link", { name: "Hacer un aporte" });
    expect(start).toHaveAttribute("href", "/aportar/nuevo");
    const inProgress = await card("Aportes en curso");
    expect(await within(inProgress).findByText("No tenés aportes en curso.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Hacer un aporte" })).toHaveLength(1);
  });
});
