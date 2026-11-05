import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

interface Seen {
  method: string;
  path: string;
  body: unknown;
  key: string | null;
}

// Every plan write, in order, with its body and Idempotency-Key.
function spyPlanWrites(): Seen[] {
  const seen: Seen[] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/v1/plans") || request.method === "GET") return;
    const entry: Seen = {
      method: request.method,
      path: url.pathname,
      body: undefined,
      key: request.headers.get("Idempotency-Key"),
    };
    seen.push(entry);
    void request
      .clone()
      .json()
      .then((body: unknown) => {
        entry.body = body;
      });
  });
  return seen;
}

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/plan", scenario });
  await screen.findByRole("heading", { level: 1, name: "Plan mensual" }, { timeout: 4000 });
  return view;
}

async function toReview(user: ReturnType<typeof userEvent.setup>, amount: string, day?: string) {
  const field = await screen.findByLabelText("Valor por mes");
  await user.clear(field);
  await user.type(field, amount);
  if (day) {
    await user.selectOptions(screen.getByRole("combobox", { name: "Día del mes" }), day);
  }
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("monthly plan (T5)", () => {
  it("says in one line why to choose each rail (T5)", async () => {
    await open("empty");
    expect(
      await screen.findByRole("radio", { name: /USDC desde una exchange/ }, { timeout: 4000 }),
    ).toHaveTextContent("Desde tu cuenta en una exchange, en USDC.");
  });

  it("Cancelar plan is a destructive outline, never a green link like the navigation", async () => {
    await open();
    const cancel = await screen.findByRole("button", { name: "Cancelar plan" });
    expect(cancel).toHaveClass("border-brick-700", "text-brick-700");
    expect(cancel).not.toHaveClass("text-green-700");
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("explains the monthly window and the reminder", async () => {
    await open("empty");
    expect(await screen.findByText(/ventana mensual de inversión/)).toBeInTheDocument();
    expect(screen.getByText(/Hora de tu aporte/)).toBeInTheDocument();
  });

  it("refuses an amount below the monthly minimum with the fixed-costs reason, and asks for no quote", async () => {
    let quotes = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.endsWith("/deposits/quote")) quotes += 1;
    });
    const user = userEvent.setup();
    await open("empty");
    await toReview(user, "200");
    expect(await screen.findByText(/El mínimo mensual es US\$\s?250,00/)).toBeInTheDocument();
    expect(screen.getByText(/costos fijos/)).toBeInTheDocument();
    expect(quotes).toBe(0);
  });

  it("offers the country's rails, USDC first and chosen, and no Brazilian rail", async () => {
    await open("empty");
    const radios = await screen.findAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("value"))).toEqual(["ar_usdc", "ar_swift"]);
    expect(radios[0]).toBeChecked();
  });

  it("creates the plan only after the cost preview, with one POST and an Idempotency-Key", async () => {
    const seen = spyPlanWrites();
    const user = userEvent.setup();
    await open("empty");
    expect(screen.queryByRole("button", { name: "Guardar plan" })).toBeNull();
    await toReview(user, "500", "Día 10");
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText(/Estimado: cada aporte usa la cotización del día/)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Guardar plan" });
    await user.dblClick(save);
    expect(await screen.findByText("Activo")).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      method: "POST",
      path: "/api/v1/plans",
      body: { amountCents: 50000, dayOfMonth: 10, rail: "ar_usdc" },
    });
    expect(seen[0]?.key).toBeTruthy();
  });

  it("pauses and resumes without asking", async () => {
    const seen = spyPlanWrites();
    const user = userEvent.setup();
    await open("open");
    await user.click(await screen.findByRole("button", { name: "Pausar plan" }));
    expect(await screen.findByRole("button", { name: "Retomar plan" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retomar plan" }));
    expect(await screen.findByRole("button", { name: "Pausar plan" })).toBeInTheDocument();
    await waitFor(() => {
      expect(seen.map((s) => s.body)).toEqual([{ status: "paused" }, { status: "active" }]);
    });
    expect(seen.every((s) => s.method === "PATCH" && s.path === "/api/v1/plans/plan-1")).toBe(true);
  });

  it("a paused plan says so, and resuming is its primary action", async () => {
    await open("plan_paused");
    expect(await screen.findByText(/Tu plan está pausado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retomar plan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar plan" })).toBeNull();
  });

  it("cancels only after confirming in the dialog", async () => {
    const seen = spyPlanWrites();
    const user = userEvent.setup();
    await open("open");
    await user.click(await screen.findByRole("button", { name: "Cancelar plan" }));
    const dialog = await screen.findByRole("dialog", { name: "¿Cancelar el plan mensual?" });
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(seen).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Cancelar plan" }));
    const again = await screen.findByRole("dialog");
    await user.click(within(again).getByRole("button", { name: "Cancelar plan" }));
    expect(await screen.findByText(/Tu plan anterior fue cancelado/)).toBeInTheDocument();
    await waitFor(() => {
      expect(seen.map((s) => s.body)).toEqual([{ status: "cancelled" }]);
    });
  });

  it("edits the plan through the same form and preview, saving with PATCH", async () => {
    const seen = spyPlanWrites();
    const user = userEvent.setup();
    await open("open");
    await user.click(await screen.findByRole("button", { name: "Editar plan" }));
    expect(await screen.findByLabelText("Valor por mes")).toHaveValue("500,00");
    await toReview(user, "600");
    await user.click(await screen.findByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Activo")).toBeInTheDocument();
    await waitFor(() => {
      expect(seen).toEqual([
        expect.objectContaining({
          method: "PATCH",
          path: "/api/v1/plans/plan-1",
          body: { amountCents: 60000, dayOfMonth: 5, rail: "ar_usdc" },
        }),
      ]);
    });
  });

  it("going back from the preview keeps what the client typed", async () => {
    const user = userEvent.setup();
    await open("empty");
    await toReview(user, "800", "Día 12");
    await user.click(await screen.findByRole("button", { name: "Volver" }));
    expect(await screen.findByLabelText("Valor por mes")).toHaveValue("800,00");
    expect(screen.getByRole("combobox", { name: "Día del mes" })).toHaveTextContent("Día 12");
  });

  it("a failed cancel keeps the dialog open and says why", async () => {
    server.use(
      http.patch("/api/v1/plans/:id", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await open("open");
    await user.click(await screen.findByRole("button", { name: "Cancelar plan" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar plan" }));
    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("a restricted account sees the note and its plan, with no action", async () => {
    await open("restricted");
    expect(await screen.findByText("Tu cuenta necesita atención.")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    for (const name of ["Pausar plan", "Editar plan", "Cancelar plan", "Continuar"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("the preview has one headline of its own and no form instructions", async () => {
    const user = userEvent.setup();
    await open("empty");
    await toReview(user, "500");
    expect(await screen.findByRole("heading", { level: 1, name: "Revisá tu plan" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: "Plan mensual" })).toBeNull();
    expect(screen.queryByText(/Elegís cuánto/)).toBeNull();
    expect(screen.getByText(/Invertir implica riesgos/)).toBeInTheDocument();
  });

  it("an existing plan leads with its amount; only the amount reads as a figure", async () => {
    await open("open");
    const amount = await screen.findByText("US$ 500,00");
    expect(amount.className).toMatch(/\btype-value-lg\b/);
    expect(screen.getByText("5 de cada mes").className).toMatch(/\btype-body\b/);
    // Nothing to choose here: the window is explained, the form's instructions are not.
    expect(screen.queryByText(/Elegís cuánto/)).toBeNull();
    expect(screen.getByText(/ventana mensual de inversión/)).toBeInTheDocument();
  });

  it("the transfer method has a visible label, like the other fields", async () => {
    await open("empty");
    await screen.findByLabelText("Valor por mes");
    expect(screen.getByText("Medio de envío")).toBeVisible();
  });

  it("loading and error show neither form instructions nor the risk note", async () => {
    server.use(
      http.get("/api/v1/plans", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    await open();
    const title = await screen.findByRole("heading", {
      name: "No pudimos cargar esta información",
    });
    expect(title.className).toMatch(/\btype-heading\b/);
    expect(screen.queryByText(/Elegís cuánto/)).toBeNull();
    expect(screen.queryByText(/Invertir implica riesgos/)).toBeNull();
  });

  it("error: retry asks again", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/plans", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 })
          : HttpResponse.json([]);
      }),
    );
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByLabelText("Valor por mes")).toBeInTheDocument();
  });
});
