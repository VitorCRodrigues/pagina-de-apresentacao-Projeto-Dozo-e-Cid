import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

const deposit = (id: string, state: string, createdAt: string) => ({
  id,
  rail: "ar_usdc",
  state,
  amountCents: 50000,
  costs: [],
  history: [{ state, at: createdAt }],
  createdAt,
  isFirstDeposit: false,
});

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/aportar", scenario });
  const history = await screen.findByRole("region", { name: "Historial" }, { timeout: 4000 });
  return { ...view, history };
}

const historyList = () => screen.findByRole("list", { name: "Historial" });

describe("deposit history (T10), inside Aportar", () => {
  it("lists only finished deposits, most recent first, and never repeats the ones in progress", async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get("/api/v1/deposits", ({ request }) => {
        const state = new URL(request.url).searchParams.get("state");
        asked.push(state);
        return HttpResponse.json({
          items:
            state === "invested,returned"
              ? [
                  deposit("old", "invested", "2026-08-01T12:00:00Z"),
                  deposit("new", "returned", "2026-10-01T12:00:00Z"),
                ]
              : [deposit("moving", "partner_collected", "2026-10-30T12:00:00Z")],
        });
      }),
    );
    await open();
    const list = await historyList();
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/aportar/new",
      "/aportar/old",
    ]);
    expect(links[0]).toHaveTextContent("Depósito devuelto");
    expect(within(list).queryByText("USDC recibido")).not.toBeInTheDocument();
    expect(asked).toContain("invested,returned");
    expect(asked).toContain(
      "deposit_notified,partner_collected,fx_executed,wire_sent,broker_credited",
    );
  });

  it("filter chips share the buttons' radius, not a pill shape", async () => {
    await open();
    for (const radio of screen.getAllByRole("radio")) {
      const chip = radio.nextElementSibling as HTMLElement;
      expect(chip.className).toMatch(/\brounded-control\b/);
      expect(chip.className).not.toMatch(/\brounded-full\b/);
    }
  });

  it("filters by state through the API", async () => {
    await open("returned");
    await historyList();
    await userEvent.click(screen.getByRole("radio", { name: "Devueltos" }));
    await waitFor(async () => {
      const links = within(await historyList()).getAllByRole("link");
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) expect(link).toHaveTextContent("Depósito devuelto");
    });
    await userEvent.click(screen.getByRole("radio", { name: "Invertidos" }));
    await waitFor(async () => {
      for (const link of within(await historyList()).getAllByRole("link")) {
        expect(link).toHaveTextContent("Invertido");
      }
    });
  });

  it("does not show the previous filter's items while the new one loads", async () => {
    server.use(
      http.get("/api/v1/deposits", async ({ request }) => {
        const state = new URL(request.url).searchParams.get("state");
        if (state === "returned") {
          await delay(200);
          return HttpResponse.json({ items: [deposit("r", "returned", "2026-09-01T12:00:00Z")] });
        }
        return HttpResponse.json({
          items:
            state === "invested,returned" ? [deposit("i", "invested", "2026-10-01T12:00:00Z")] : [],
        });
      }),
    );
    await open();
    await historyList();
    await userEvent.click(screen.getByRole("radio", { name: "Devueltos" }));
    expect(screen.queryByRole("link", { name: /Invertido/ })).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Depósito devuelto/ })).toBeInTheDocument();
  });

  it("an item opens the deposit detail (T8)", async () => {
    const { router } = await open();
    const first = within(await historyList()).getAllByRole("link")[0] as HTMLElement;
    await userEvent.click(first);
    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/aportar\/dep-/);
    });
  });

  it("loads more pages on demand", async () => {
    server.use(
      http.get("/api/v1/deposits", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("state") !== "invested,returned")
          return HttpResponse.json({ items: [] });
        return HttpResponse.json(
          url.searchParams.get("cursor")
            ? { items: [deposit("p2", "invested", "2026-07-01T12:00:00Z")] }
            : { items: [deposit("p1", "invested", "2026-09-01T12:00:00Z")], nextCursor: "c2" },
        );
      }),
    );
    await open();
    await historyList();
    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));
    await waitFor(async () => {
      expect(within(await historyList()).getAllByRole("link")).toHaveLength(2);
    });
    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });

  it("En curso also loads more pages, so no deposit in progress is out of reach", async () => {
    server.use(
      http.get("/api/v1/deposits", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("state") === "invested,returned") {
          return HttpResponse.json({ items: [] });
        }
        return HttpResponse.json(
          url.searchParams.get("cursor")
            ? { items: [deposit("m2", "wire_sent", "2026-10-01T12:00:00Z")] }
            : {
                items: [deposit("m1", "deposit_notified", "2026-10-30T12:00:00Z")],
                nextCursor: "c2",
              },
        );
      }),
    );
    await open();
    const inProgress = await screen.findByRole("list", { name: "En curso" });
    expect(within(inProgress).getAllByRole("link")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));
    await waitFor(() => {
      expect(within(inProgress).getAllByRole("link")).toHaveLength(2);
    });
  });

  it("empty: says what will show up, and leaves the action to the screen's one primary button", async () => {
    const { history } = await open("empty");
    expect(
      await within(history).findByText("Todavía no tenés aportes finalizados"),
    ).toBeInTheDocument();
    expect(within(history).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo aporte" })).toHaveAttribute(
      "href",
      "/aportar/nuevo",
    );
  });

  it("empty filter: says so and offers to see all", async () => {
    const { history } = await open("open");
    await historyList();
    await userEvent.click(within(history).getByRole("radio", { name: "Devueltos" }));
    expect(await within(history).findByText("No tenés aportes devueltos.")).toBeInTheDocument();
    await userEvent.click(within(history).getByRole("button", { name: "Ver todos" }));
    expect(within(history).getByRole("radio", { name: "Todos" })).toBeChecked();
    expect(await historyList()).toBeInTheDocument();
  });

  it("error: retry asks again", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/deposits", ({ request }) => {
        if (new URL(request.url).searchParams.get("state") !== "invested,returned") {
          return HttpResponse.json({ items: [] });
        }
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 })
          : HttpResponse.json({ items: [deposit("i", "invested", "2026-10-01T12:00:00Z")] });
      }),
    );
    const { history } = await open();
    await userEvent.click(await within(history).findByRole("button", { name: "Reintentar" }));
    expect(await historyList()).toBeInTheDocument();
  });
});
