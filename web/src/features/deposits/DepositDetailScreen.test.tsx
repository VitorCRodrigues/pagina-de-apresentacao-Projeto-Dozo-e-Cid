import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { lucia } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

const address = "0x52908400098527886E0F7030069857D2E4169EE7";

async function open(scenario: ScenarioId, id = "dep-scenario") {
  const view = renderApp({ path: `/aportar/${id}`, scenario });
  await screen.findByRole("list", { name: "Estado del aporte" }, { timeout: 4000 });
  return view;
}

const timelineText = () => screen.getByRole("list", { name: "Estado del aporte" }).textContent;

// Serves dep-scenario as `base` with some fields changed.
function patchDeposit(patch: Record<string, unknown>) {
  server.use(
    http.get("/api/v1/deposits/dep-scenario", () => HttpResponse.json({ ...base, ...patch })),
  );
}

const base = {
  id: "dep-scenario",
  rail: "ar_usdc",
  state: "partner_collected",
  amountCents: 50000,
  costs: [{ kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false }],
  history: [
    { state: "deposit_notified", at: "2026-10-30T12:00:00Z" },
    { state: "partner_collected", at: "2026-10-30T14:00:00Z" },
  ],
  createdAt: "2026-10-30T12:00:00Z",
  isFirstDeposit: false,
};

describe("deposit detail (T8)", () => {
  it("ar_usdc never shows the exchange or wire steps, and says USDC recibido", async () => {
    patchDeposit({
      history: [...base.history, { state: "fx_executed", at: "2026-10-30T15:00:00Z" }],
      state: "fx_executed",
    });
    await open("partner_collected");
    expect(timelineText()).toContain("USDC recibido");
    expect(timelineText()).not.toMatch(/Cambio realizado|Transferencia enviada/);
    expect(timelineText()).not.toMatch(/fx_executed|wire_sent|partner_collected/);
  });

  it("deposit_notified leads with the instructions while the account is open", async () => {
    await open("deposit_notified");
    expect(screen.getByRole("heading", { name: "Cómo enviar el dinero" })).toBeInTheDocument();
    expect(screen.getByText(address)).toBeInTheDocument();
    expect(screen.getByText("Esperando tu depósito", { selector: "p" })).toBeInTheDocument();
  });

  it("never shows instructions on an account that is not open", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json({ ...lucia, accountStatus: "restricted" })),
      http.get("/api/v1/account", () =>
        HttpResponse.json({ status: "restricted", pending: [], blockReasons: ["ibkr_restricted"] }),
      ),
    );
    await open("deposit_notified");
    expect(screen.queryByText(address)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cómo enviar el dinero" })).toBeNull();
    expect(
      screen.getByText(/no están disponibles mientras tu cuenta necesita atención/),
    ).toBeInTheDocument();
  });

  it("keeps a client whose account is not open away from the deposit entirely", async () => {
    const { router } = renderApp({ path: "/aportar/dep-scenario", scenario: "ibkr_pending" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/cuenta");
    });
    expect(screen.queryByText(address)).toBeNull();
  });

  it("broker_credited explains the wait until the next investment window", async () => {
    await open("broker_credited");
    expect(screen.getByText(/hasta la próxima ventana de inversión/)).toBeInTheDocument();
  });

  it("an overdue step gets a gentle note with support", async () => {
    patchDeposit({ expectedBy: "2026-10-01T00:00:00Z" });
    await open("partner_collected");
    expect(screen.getByText("Este paso está tardando más de lo habitual.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Escribir a soporte" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });

  it("returned shows the reason from the API and the refund text", async () => {
    await open("returned");
    expect(screen.getByText("Devolvimos este depósito")).toBeInTheDocument();
    expect(screen.getByText(/no está a tu nombre/)).toBeInTheDocument();
    expect(screen.getByText(/vuelve a la cuenta de origen/)).toBeInTheDocument();
  });

  it("shows sent, costs, credited and invested amounts when they exist", async () => {
    await open("invested");
    const values = screen.getByRole("region", { name: "Valores" });
    for (const label of ["Enviado", "Costos", "Acreditado en tu cuenta", "Invertido"]) {
      expect(within(values).getByText(label)).toBeInTheDocument();
    }
  });

  it("Ya envié tells support once and leaves the state as it was", async () => {
    let notices = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/sent-notice")) notices += 1;
    });
    const user = userEvent.setup();
    await open("deposit_notified");
    await user.dblClick(screen.getByRole("button", { name: "Ya envié" }));
    expect(await screen.findByText(/Avisamos al equipo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ya envié" })).toBeNull();
    expect(notices).toBe(1);
    expect(screen.getByText("Esperando tu depósito", { selector: "p" })).toBeInTheDocument();
    server.events.removeAllListeners();
  });

  it("an unknown deposit says so", async () => {
    renderApp({ path: "/aportar/dep-nope", scenario: "open" });
    expect(
      await screen.findByRole("heading", { name: "No encontramos este aporte" }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it("notices an overdue step on a later refresh, without a remount", async () => {
    patchDeposit({ expectedBy: new Date(Date.now() + 300).toISOString() });
    const { queryClient } = await open("partner_collected");
    expect(screen.queryByText("Este paso está tardando más de lo habitual.")).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await queryClient.invalidateQueries();
    expect(
      await screen.findByText("Este paso está tardando más de lo habitual."),
    ).toBeInTheDocument();
  });
});
