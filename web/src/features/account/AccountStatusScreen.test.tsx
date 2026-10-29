import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { accountStatuses } from "@/api/schemas";
import type { AccountStatus } from "@/api/types";
import { renderApp } from "@/test/render-app";

const titles: Record<AccountStatus, string> = {
  draft: "Tu solicitud está sin terminar",
  submitted: "Recibimos tu solicitud",
  kyc_review: "Estamos verificando tu identidad",
  ibkr_pending: "Interactive Brokers está analizando tu cuenta",
  action_required: "Interactive Brokers necesita documentos",
  open: "Tu cuenta está abierta",
  rejected: "No pudimos abrir tu cuenta",
  restricted: "Tu cuenta necesita atención",
};

async function open(status: AccountStatus) {
  const view = renderApp({ path: "/cuenta", scenario: status });
  await screen.findByRole("heading", { level: 1, name: titles[status] }, { timeout: 4000 });
  return view;
}

describe("account status (T3)", () => {
  it.each(accountStatuses)(
    "%s: its own title, the custody note and no deposit instructions",
    async (status) => {
      await open(status);
      const main = screen.getByRole("main");
      expect(
        within(main).getByText(
          "Tu cuenta se abre en Interactive Brokers, a tu nombre. OpenDollars es tu asesora de inversiones.",
        ),
      ).toBeInTheDocument();
      expect(main.textContent).not.toMatch(/depósit|deposit|transferí|USDC|SWIFT|minuto/i);
      for (const link of within(main).queryAllByRole("link")) {
        expect(link.getAttribute("href")).not.toBe("/aportar");
      }
    },
  );

  it.each(["submitted", "kyc_review", "ibkr_pending"] as const)(
    "%s: a calm few-business-days estimate and the opening timeline",
    async (status) => {
      await open(status);
      expect(screen.getByText(/Suele tardar algunos días hábiles/)).toBeInTheDocument();
      const timeline = screen.getByRole("list", { name: "Apertura de tu cuenta" });
      expect(within(timeline).getAllByRole("listitem")).toHaveLength(4);
    },
  );

  it("draft: one way back to the application", async () => {
    const user = userEvent.setup();
    const { router } = await open("draft");
    await user.click(screen.getByRole("link", { name: "Continuar la solicitud" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/onboarding/);
    });
  });

  it("open: a sober confirmation with a single action, the monthly plan", async () => {
    await open("open");
    const main = screen.getByRole("main");
    expect(within(main).getByText("U****4821")).toBeInTheDocument();
    const actions = [
      ...within(main).queryAllByRole("button"),
      ...within(main).queryAllByRole("link"),
    ];
    expect(actions.map((action) => action.textContent)).toEqual(["Crear plan mensual"]);
    expect(within(main).getByRole("link", { name: "Crear plan mensual" })).toHaveAttribute(
      "href",
      "/plan",
    );
  });

  it("rejected: neutral text, no reason, and the support contact", async () => {
    await open("rejected");
    expect(
      screen.getByText(
        "Revisamos tu solicitud y no podemos abrir la cuenta en este momento. Si tenés preguntas, escribinos.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Escribir a soporte" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.queryByRole("list", { name: "Apertura de tu cuenta" })).toBeNull();
  });

  it("restricted: keeps the bottom navigation and offers support", async () => {
    await open("restricted");
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Escribir a soporte" })).toBeInTheDocument();
  });

  it("action_required: sends a requested document and drops it from the list", async () => {
    const user = userEvent.setup();
    await open("action_required");
    const items = within(screen.getByRole("list", { name: "Documentos pedidos" })).getAllByRole(
      "listitem",
    );
    const first = items[0];
    if (!first) throw new Error("no pending documents in the scenario");
    const title = first.querySelector("p")?.textContent ?? "";

    await user.upload(
      within(first).getByLabelText("Elegir archivo"),
      new File(["%PDF"], "comprobante.pdf", { type: "application/pdf" }),
    );
    await user.click(within(first).getByRole("button", { name: "Enviar documento" }));
    await waitFor(() => {
      expect(screen.queryByText(title)).toBeNull();
    });
  });
});
