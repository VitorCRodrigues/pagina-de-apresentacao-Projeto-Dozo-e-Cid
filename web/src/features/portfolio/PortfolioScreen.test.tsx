import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config } from "@/mocks/fixtures";
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
  positions: [
    {
      isin: "IE00B5BMR087",
      name: "iShares Core S&P 500 UCITS ETF",
      shares: 2,
      valueCents: 70000,
      weight: 0.5833,
      targetWeight: 0.6,
      description: "Las 500 empresas más grandes de Estados Unidos.",
    },
    {
      isin: "IE00B4L5Y983",
      name: "iShares Core MSCI World UCITS ETF",
      shares: 1,
      valueCents: 50000,
      weight: 0.4167,
      targetWeight: 0.4,
      description: "Empresas grandes y medianas de países desarrollados.",
    },
  ],
  asOf: "2026-10-31T06:00:00Z",
};

function servePortfolio(body: typeof portfolio = portfolio) {
  server.use(http.get("/api/v1/portfolio", () => HttpResponse.json(body)));
}

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/cartera", scenario });
  await screen.findByRole("heading", { level: 1, name: "Cartera" }, { timeout: 4000 });
  return view;
}

const total = () => screen.findByText("Total");

describe("portfolio (T9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the total as the sum of the buckets and each bucket with its share", async () => {
    servePortfolio();
    await open();
    await total();
    expect(screen.getAllByText("US$ 2.012,00").length).toBeGreaterThan(0);
    const split = screen.getByRole("region", { name: "Cómo se divide" });
    expect(within(split).getByText("Invertido")).toBeInTheDocument();
    expect(within(split).getByText("US$ 1.200,00")).toBeInTheDocument();
    expect(within(split).getByText("En caja en Interactive Brokers")).toBeInTheDocument();
    expect(within(split).getByText("US$ 312,00")).toBeInTheDocument();
    expect(within(split).getByText("En tránsito")).toBeInTheDocument();
    expect(within(split).getByText("US$ 500,00")).toBeInTheDocument();
    // 120000 / 201200 = 59.64%, 31200 / 201200 = 15.51%, 50000 / 201200 = 24.85%.
    expect(within(split).getByText(/59,6\d?\s?% del total/)).toBeInTheDocument();
  });

  it("keeps fees paid out of the total, on a secondary line", async () => {
    servePortfolio();
    await open();
    expect(
      await screen.findByText(/Costos pagados hasta hoy: US\$ 4,50\. No forman parte del total\./),
    ).toBeInTheDocument();
  });

  it("trusts the buckets when the API total disagrees, and tells monitoring without amounts", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    servePortfolio({ ...portfolio, totalCents: 999 });
    await open();
    await total();
    expect(screen.getAllByText("US$ 2.012,00").length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledWith("[opendollars] portfolio_total_mismatch");
    expect(String(warn.mock.calls)).not.toMatch(/2012|999/);
  });

  it("lists each position with ISIN, whole shares, value and current vs. target weight", async () => {
    servePortfolio();
    await open();
    const list = await screen.findByRole("list", { name: "Posiciones" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = items[0] as HTMLElement;
    expect(within(first).getByText("iShares Core S&P 500 UCITS ETF")).toBeInTheDocument();
    expect(within(first).getByText(/IE00B5BMR087/)).toBeInTheDocument();
    expect(within(first).getByText(/2 acciones/)).toBeInTheDocument();
    expect(within(first).getByText("US$ 700,00")).toBeInTheDocument();
    expect(
      within(first).getByText(/58,3\s?% de la cartera · objetivo 60,0\s?%/),
    ).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText(/1 acción/)).toBeInTheDocument();
  });

  it("opens the fund description on demand", async () => {
    servePortfolio();
    await open();
    const description = await screen.findByText("Las 500 empresas más grandes de Estados Unidos.");
    expect(description).not.toBeVisible();
    await userEvent.click(screen.getAllByText("Qué es este fondo")[0] as HTMLElement);
    expect(description).toBeVisible();
  });

  it("never colours values, weights or bars as gains or losses", async () => {
    servePortfolio();
    await open();
    await screen.findByRole("list", { name: "Posiciones" });
    const scope = [
      screen.getByRole("region", { name: "Cómo se divide" }),
      screen.getByRole("list", { name: "Posiciones" }),
    ];
    for (const region of scope) {
      for (const element of region.querySelectorAll("*")) {
        expect(element.getAttribute("class") ?? "").not.toMatch(/green|brick|amber/);
      }
    }
  });

  it("explains asOf, links to the official IBKR statements and shows the risk note", async () => {
    servePortfolio();
    await open();
    // The card says when; the footer, next to the official statements, says where from.
    expect(await screen.findByText(/^Actualizado el .*2026.*\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Los valores se actualizan una vez por día a partir de Interactive Brokers.",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /Ver extractos oficiales en Interactive Brokers/,
    });
    expect(link).toHaveAttribute("href", config.ibkrPortalUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(screen.getByText(/Invertir implica riesgos/)).toBeInTheDocument();
  });

  it("only in transit: no positions, and the date of the next investment window", async () => {
    await open("in_flight_only");
    expect(await screen.findByText(/Todavía no tenés fondos comprados/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Posiciones" })).not.toBeInTheDocument();
  });

  it("uses the deposit's window date from the server for the waiting note", async () => {
    servePortfolio({
      ...portfolio,
      positions: [],
      buckets: { investedCents: 0, ibkrCashCents: 50000, inFlightCents: 0, feesPaidCents: 0 },
      totalCents: 50000,
    });
    server.use(
      http.get("/api/v1/deposits", () =>
        HttpResponse.json({
          items: [
            {
              id: "dep-1",
              rail: "ar_usdc",
              state: "broker_credited",
              amountCents: 50000,
              costs: [],
              history: [{ state: "broker_credited", at: "2026-10-30T12:00:00Z" }],
              nextInvestmentWindow: "2027-03-09T14:00:00Z",
              createdAt: "2026-10-30T12:00:00Z",
              isFirstDeposit: true,
            },
          ],
        }),
      ),
    );
    await open();
    expect(await screen.findByText(/el 9 mar 2027/)).toBeInTheDocument();
  });

  it("waits for the server's window date instead of flashing the local one", async () => {
    servePortfolio({
      ...portfolio,
      positions: [],
      buckets: { investedCents: 0, ibkrCashCents: 50000, inFlightCents: 0, feesPaidCents: 0 },
      totalCents: 50000,
    });
    server.use(
      http.get("/api/v1/deposits", async () => {
        await delay(300);
        return HttpResponse.json({ items: [] });
      }),
    );
    await open();
    await total();
    expect(screen.queryByText(/Todavía no tenés fondos comprados/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Todavía no tenés fondos comprados/)).toBeInTheDocument();
  });

  it("a failed refetch of GET /config keeps the statements link from the cache", async () => {
    servePortfolio();
    const { queryClient } = await open();
    await screen.findByRole("link", { name: /Ver extractos oficiales/ });
    server.use(
      http.get("/api/v1/config", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    await queryClient.refetchQueries({ queryKey: ["config"] });
    expect(screen.getByRole("link", { name: /Ver extractos oficiales/ })).toHaveAttribute(
      "href",
      config.ibkrPortalUrl,
    );
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("empty: a useful empty state that leads to a first deposit", async () => {
    await open("empty");
    expect(await screen.findByText("Todavía no tenés inversiones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hacer un aporte" })).toHaveAttribute(
      "href",
      "/aportar/nuevo",
    );
    expect(screen.getByText(/Invertir implica riesgos/)).toBeInTheDocument();
  });

  it("error: retry asks again", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/portfolio", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 })
          : HttpResponse.json(portfolio);
      }),
    );
    renderApp({ path: "/cartera" });
    await userEvent.click(
      await screen.findByRole("button", { name: "Reintentar" }, { timeout: 4000 }),
    );
    await waitFor(() => {
      expect(screen.getAllByText("US$ 2.012,00").length).toBeGreaterThan(0);
    });
  });
});
