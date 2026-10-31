import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { describe, expect, it } from "vitest";
import type { BlockReason, Quote, RailOption } from "@/api/types";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

type User = ReturnType<typeof userEvent.setup>;

const option = (rail: RailOption["rail"], recommended: boolean): RailOption => ({
  rail,
  recommended,
  costs: [
    { kind: "rail_fee", label: "x", amountCents: 150, percent: 0.003, estimated: false },
    { kind: "fx_spread", label: "x", amountCents: 100, percent: 0.002, estimated: true },
  ],
  totalCostCents: 250,
  netToInvestCents: 49750,
  expectedDays: { min: 0, max: 1 },
});

function serveQuote(expiresAt: string, extra: Partial<Quote> = {}, headers?: HeadersInit) {
  const quote: Quote = {
    id: `q-${expiresAt}`,
    amountCents: 50000,
    options: [option("ar_usdc", true), option("ar_swift", false), option("br_efx", false)],
    expiresAt,
    ...extra,
  };
  server.use(
    http.post("/api/v1/deposits/quote", () =>
      HttpResponse.json(quote as unknown as JsonBodyType, headers ? { headers } : undefined),
    ),
  );
  return quote;
}

const inFiveMinutes = () => new Date(Date.now() + 5 * 60_000).toISOString();

async function open(scenario: Parameters<typeof renderApp>[0] = {}) {
  const view = renderApp({ path: "/aportar/nuevo", ...scenario });
  await screen.findByRole("heading", { name: "¿Cuánto querés aportar?" }, { timeout: 4000 });
  return view;
}

async function toRail(user: User, amount = "500") {
  await user.type(screen.getByLabelText("Valor en dólares"), amount);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "¿Cómo vas a enviar el dinero?" });
}

async function toPreview(user: User) {
  await toRail(user);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Revisá tu aporte" });
}

describe("new deposit (T6)", () => {
  it.each<[BlockReason, string]>([
    ["ibkr_restricted", "Escribir a soporte"],
    ["compliance_hold", "Escribir a soporte"],
    ["ibkr_not_open", "Ver el estado de tu cuenta"],
  ])("%s replaces the form with its message and action", async (reason, action) => {
    server.use(
      http.get("/api/v1/account", () =>
        HttpResponse.json({ status: "open", pending: [], blockReasons: [reason] }),
      ),
    );
    renderApp({ path: "/aportar/nuevo" });
    expect(
      await screen.findByRole("link", { name: action }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Valor en dólares")).toBeNull();
  });

  it("explains an amount below the minimum and asks for no quote", async () => {
    let quotes = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/deposits/quote")) quotes += 1;
    });
    const user = userEvent.setup();
    await open();
    expect(screen.getByText(/El mínimo es US\$\s?100,00/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Valor en dólares"), "50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText(/con menos, los costos fijos/)).toBeInTheDocument();
    expect(quotes).toBe(0);
    server.events.removeAllListeners();
  });

  it("offers no confirm button before the cost preview is on screen", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    await open();
    expect(screen.queryByRole("button", { name: "Confirmar aporte" })).toBeNull();
    await toRail(user);
    expect(screen.queryByRole("button", { name: "Confirmar aporte" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    const confirm = await screen.findByRole("button", { name: "Confirmar aporte" });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Llega para invertir")).toBeInTheDocument();
    expect(confirm).toBeEnabled();
  });

  it("comes with the recommended rail selected and hides Brazilian rails", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    await open();
    await toRail(user);
    expect(screen.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();
    expect(screen.getByText("Recomendado: el costo más bajo para este monto.")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Pix/ })).toBeNull();
  });

  it("an expired quote disables Confirmar and offers a new one", async () => {
    serveQuote(new Date(Date.now() - 1000).toISOString());
    const user = userEvent.setup();
    await open();
    await toPreview(user);
    expect(await screen.findByText("La cotización venció")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();

    serveQuote(inFiveMinutes(), { id: "q-fresh" });
    await user.click(screen.getByRole("button", { name: "Generar nueva cotización" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
    });
    expect(screen.queryByText("La cotización venció")).toBeNull();
  });

  it("runs the countdown on the server's clock when the phone's is off", async () => {
    // The phone is 10 minutes ahead: by its own clock, the quote expired 5 minutes ago.
    const serverNow = Date.now() - 10 * 60_000;
    serveQuote(
      new Date(serverNow + 5 * 60_000).toISOString(),
      {},
      {
        Date: new Date(serverNow).toUTCString(),
      },
    );
    const user = userEvent.setup();
    await open();
    await toPreview(user);
    expect(screen.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
    expect(screen.queryByText("La cotización venció")).toBeNull();
    expect(screen.getByRole("timer")).toHaveTextContent(/^[45]:\d\d$/);
  });

  it("409 quote_expired from the server brings the preview back as expired", async () => {
    const user = userEvent.setup();
    await open({ scenario: "quote_expired" });
    await toPreview(user);
    await user.click(screen.getByRole("button", { name: "Confirmar aporte" }));
    expect(await screen.findByText("La cotización venció")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();

    // A new quote is a fresh start: the old refusal no longer applies.
    await user.click(screen.getByRole("button", { name: "Generar nueva cotización" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar aporte" })).toBeEnabled();
    });
    expect(screen.queryByText("La cotización venció")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a double click sends one POST with one key and opens the deposit", async () => {
    const keys: (string | null)[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && request.url.endsWith("/api/v1/deposits")) {
        keys.push(request.headers.get("Idempotency-Key"));
      }
    });
    const user = userEvent.setup();
    const { router } = await open();
    await toPreview(user);
    await user.dblClick(screen.getByRole("button", { name: "Confirmar aporte" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/aportar\/(?!nuevo)[\w-]+$/);
    });
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    server.events.removeAllListeners();
  });

  it("the browser's Back walks the steps back, with the amount out of the URL", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    const { router } = await open();
    await toPreview(user);

    await router.navigate(-1);
    expect(
      await screen.findByRole("heading", { name: "¿Cómo vas a enviar el dinero?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /USDC desde una exchange/ })).toBeChecked();

    await router.navigate(-1);
    expect(await screen.findByLabelText("Valor en dólares")).toHaveValue("500,00");
    expect(router.state.location.pathname).toBe("/aportar/nuevo");
    expect(router.state.location.search).toBe("");
    expect(JSON.stringify(router.state.location.state)).not.toContain("500");
  });

  it("says so when a new quote cannot be fetched", async () => {
    serveQuote(new Date(Date.now() - 1000).toISOString());
    const user = userEvent.setup();
    await open();
    await toPreview(user);
    server.use(
      http.post("/api/v1/deposits/quote", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Generar nueva cotización" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("a new quote without the chosen rail sends the client back to choose", async () => {
    serveQuote(new Date(Date.now() - 1000).toISOString());
    const user = userEvent.setup();
    await open();
    await toRail(user);
    await user.click(screen.getByRole("radio", { name: /Transferencia bancaria SWIFT/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Revisá tu aporte" });

    serveQuote(inFiveMinutes(), { id: "q-usdc-only", options: [option("ar_usdc", true)] });
    await user.click(screen.getByRole("button", { name: "Generar nueva cotización" }));
    expect(
      await screen.findByRole("heading", { name: "¿Cómo vas a enviar el dinero?" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar aporte" })).toBeNull();
  });

  it("a step left in history by a reload is cleared, so Back stays in order", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    const { router } = await open();
    // What a reload on the preview leaves behind: the step, but no quote in memory.
    await router.navigate("/aportar/nuevo", { state: { depositStep: "preview" }, replace: true });
    await screen.findByLabelText("Valor en dólares");
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
    await toRail(user);
    await router.navigate(-1);
    expect(await screen.findByLabelText("Valor en dólares")).toBeInTheDocument();
  });

  it("prefills the amount with its cents when the client comes back", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    const { router } = await open();
    await toRail(user, "150,5");
    await router.navigate(-1);
    expect(await screen.findByLabelText("Valor en dólares")).toHaveValue("150,50");
  });

  it("sets the amount that arrives to invest apart from the cost table, once", async () => {
    serveQuote(inFiveMinutes());
    const user = userEvent.setup();
    await open();
    await toPreview(user);
    const table = screen.getByRole("table");
    expect(within(table).queryByText("Llega para invertir")).toBeNull();
    expect(screen.getAllByText("Llega para invertir")).toHaveLength(1);
  });
});

describe("deposit tab (/aportar)", () => {
  it("offers a new deposit and lists those in progress", async () => {
    renderApp({ path: "/aportar", scenario: "deposit_notified" });
    expect(
      await screen.findByRole("link", { name: "Nuevo aporte" }, { timeout: 4000 }),
    ).toHaveAttribute("href", "/aportar/nuevo");
    const list = await screen.findByRole("list", { name: "En curso" });
    const link = within(list).getByRole("link", { name: /Esperando tu depósito/ });
    expect(link).toHaveAttribute("href", "/aportar/dep-scenario");
  });
});
