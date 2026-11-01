import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

const item = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind,
  title: `Título ${id}`,
  description: `Descripción ${id}`,
  createdAt: "2026-10-30T12:00:00Z",
  ...extra,
});

function serve(items: unknown[]) {
  server.use(http.get("/api/v1/notifications", () => HttpResponse.json(items)));
}

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/pendientes", scenario });
  await screen.findByRole("heading", { level: 1, name: "Pendientes" }, { timeout: 4000 });
  return view;
}

const row = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

describe("pending items (T11)", () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("groups by kind, money first, with exactly one action per item", async () => {
    serve([
      item("n", "notice"),
      item("t", "terms", { termsId: "terms-advisory" }),
      item("d", "document"),
      item("a", "deposit_action", { depositId: "dep-1" }),
    ]);
    await open();
    await screen.findByText("Título a");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Aportes",
      "Documentos",
      "Términos para aceptar",
      "Avisos",
    ]);
    for (const id of ["a", "d", "t", "n"]) {
      const controls = [
        ...within(row(`Título ${id}`)).queryAllByRole("button"),
        ...within(row(`Título ${id}`)).queryAllByRole("link"),
      ];
      expect(controls).toHaveLength(1);
    }
  });

  it("orders by deadline and marks the overdue one", async () => {
    serve([
      item("later", "document", { dueAt: "2099-01-10T12:00:00Z" }),
      item("late", "document", { dueAt: "2020-01-10T12:00:00Z" }),
    ]);
    await open();
    const list = await screen.findByRole("list", { name: "Documentos" });
    const titles = within(list)
      .getAllByRole("listitem")
      .map((li) => li.querySelector("h3")?.textContent);
    expect(titles).toEqual(["Título late", "Título later"]);
    expect(within(row("Título late")).getByText(/^Venció el /)).toBeInTheDocument();
    expect(within(row("Título later")).getByText(/^Hasta el /)).toBeInTheDocument();
  });

  it("a deposit waiting on the client links to its instructions", async () => {
    serve([item("a", "deposit_action", { depositId: "dep-7" })]);
    await open();
    expect(await screen.findByRole("link", { name: "Ver instrucciones" })).toHaveAttribute(
      "href",
      "/aportar/dep-7",
    );
  });

  it("the plan reminder opens a new deposit with the plan id only, never the amount", async () => {
    await open("plan_reminder");
    const link = await screen.findByRole("link", { name: "Hacer el aporte" });
    expect(link).toHaveAttribute("href", "/aportar/nuevo?plan=plan-1");
    expect(link.getAttribute("href")).not.toMatch(/500|amount/);
  });

  it("a requested document opens the upload", async () => {
    serve([item("d", "document")]);
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: "Enviar documento" }));
    const sheet = await screen.findByRole("dialog", { name: "Título d" });
    expect(within(sheet).getByText("Descripción d")).toBeInTheDocument();
  });

  it("new terms: no acceptance before the document is shown, then an explicit unticked box", async () => {
    const accepted: unknown[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/accept")) {
        void request
          .clone()
          .json()
          .then((body: unknown) => accepted.push(body));
      }
    });
    const user = userEvent.setup();
    await open("terms_update");
    await user.click(await screen.findByRole("button", { name: "Revisar y aceptar" }));
    const dialog = await screen.findByRole("dialog");
    const box = await within(dialog).findByRole("checkbox");
    const confirm = within(dialog).getByRole("button", { name: "Aceptar" });
    expect(box).not.toBeChecked();
    expect(box).toBeDisabled();
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText("Abrí el documento para poder aceptarlo.")).toBeInTheDocument();
    await user.click(box);
    await user.click(confirm);
    expect(accepted).toHaveLength(0);

    await user.click(
      within(dialog).getByRole("link", { name: /Leer el documento \(versión 2026-11\)/ }),
    );
    expect(box).toBeEnabled();
    expect(confirm).toBeDisabled();
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(confirm);
    await waitFor(() => {
      expect(accepted).toHaveLength(1);
    });
    expect(accepted[0]).toMatchObject({ id: "terms-advisory", version: "2026-11" });
    expect((accepted[0] as { acceptedAt: string }).acceptedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    );
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Revisar y aceptar" })).toBeNull();
    });
  });

  it("a terms item without termsId still opens the document waiting for acceptance", async () => {
    serve([item("t", "terms")]);
    server.use(
      http.get("/api/v1/account/terms", () =>
        HttpResponse.json([
          {
            id: "terms-privacy",
            kind: "privacy_policy",
            version: "2026-11",
            title: "Política de privacidad",
            url: "#terms/privacy_policy",
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: "Revisar y aceptar" }));
    const dialog = await screen.findByRole("dialog", { name: "Política de privacidad" });
    expect(within(dialog).getByRole("link", { name: /versión 2026-11/ })).toBeInTheDocument();
  });

  it("a notice leaves the list once read", async () => {
    const user = userEvent.setup();
    await open("open");
    await user.click(await screen.findByRole("button", { name: "Entendido" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Entendido" })).toBeNull();
    });
  });

  it("empty: a reassuring statement line, no large icon", async () => {
    await open("empty");
    expect(await screen.findByRole("heading", { name: "Estás al día" })).toBeInTheDocument();
    expect(document.querySelector("main svg, section svg")).toBeNull();
  });

  it("error: retry asks again", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/notifications", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 })
          : HttpResponse.json([]);
      }),
    );
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Estás al día" })).toBeInTheDocument();
  });
});
