import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import type { Questionnaire } from "@/api/proposed-types";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

const questionnaire: Questionnaire = {
  version: "2026-10",
  questions: [
    {
      id: "horizon",
      kind: "single",
      label: "Horizonte",
      options: [
        { value: "long", label: "Largo" },
        { value: "short", label: "Corto" },
      ],
    },
  ],
};

function serve(answers: Record<string, unknown>, q: unknown = questionnaire) {
  server.use(
    http.get("/api/v1/onboarding/questionnaire", () => HttpResponse.json(q as Questionnaire)),
    http.get("/api/v1/account/suitability", () =>
      HttpResponse.json({
        questionnaireVersion: "2026-10",
        answers,
        completedAt: "2026-09-01T12:00:00Z",
      }),
    ),
  );
}

async function open() {
  const view = renderApp({ path: "/perfil/inversor" });
  await screen.findByRole("heading", { level: 1, name: "Perfil de inversor" }, { timeout: 4000 });
  return view;
}

describe("redoing the investor profile (T12)", () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("brings the saved answers, and saves new ones with the questionnaire's version", async () => {
    serve({ horizon: "long" });
    const bodies: unknown[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "PUT" && request.url.endsWith("/account/suitability")) {
        void request
          .clone()
          .json()
          .then((body: unknown) => bodies.push(body));
      }
    });
    const user = userEvent.setup();
    const { router } = await open();
    expect(await screen.findByRole("radio", { name: "Largo" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Corto" }));
    await user.click(screen.getByRole("button", { name: "Guardar respuestas" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/perfil");
    });
    expect(bodies).toEqual([{ questionnaireVersion: "2026-10", answers: { horizon: "short" } }]);
    expect(await screen.findByText("Guardamos tus respuestas")).toBeInTheDocument();
  });

  it("does not save with a question unanswered", async () => {
    serve({});
    let saves = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.method === "PUT") saves += 1;
    });
    const user = userEvent.setup();
    const { router } = await open();
    await user.click(await screen.findByRole("button", { name: "Guardar respuestas" }));
    expect(await screen.findByRole("group", { name: "Horizonte" })).toHaveAccessibleDescription();
    // The errors can be out of sight: the answer to the tap sits next to the button.
    expect(screen.getByRole("alert")).toHaveTextContent("Falta 1 respuesta.");
    expect(saves).toBe(0);
    expect(router.state.location.pathname).toBe("/perfil/inversor");
  });

  it("options read the same in every question, with no double rule between questions", async () => {
    serve({ horizon: "long" });
    await open();
    const group = await screen.findByRole("group", { name: "Horizonte" });
    expect(group.className).not.toMatch(/\bborder-t\b/);
    expect(screen.getByText("Largo").className).toMatch(/\btype-body\b/);
  });

  it("an answer the questionnaire no longer offers starts unanswered", async () => {
    serve({ horizon: "gone" });
    await open();
    expect(await screen.findByRole("radio", { name: "Largo" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Corto" })).not.toBeChecked();
  });

  it("answers to another version start blank, and the screen says the questions changed", async () => {
    serve({ horizon: "long" });
    server.use(
      http.get("/api/v1/account/suitability", () =>
        HttpResponse.json({ questionnaireVersion: "2025-01", answers: { horizon: "long" } }),
      ),
    );
    await open();
    expect(await screen.findByRole("radio", { name: "Largo" })).not.toBeChecked();
    expect(screen.getByText(/Las preguntas cambiaron/)).toBeInTheDocument();
  });

  it("a failed background refresh keeps the form and what was being answered", async () => {
    serve({ horizon: "long" });
    const user = userEvent.setup();
    const { queryClient } = await open();
    await user.click(await screen.findByRole("radio", { name: "Corto" }));
    server.use(
      http.get("/api/v1/onboarding/questionnaire", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
      http.get("/api/v1/account/suitability", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["session"] });
      // The query's result reaches React on the next tick.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByRole("radio", { name: "Corto" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("works when no answers were saved yet (404)", async () => {
    serve({});
    server.use(
      http.get("/api/v1/account/suitability", () =>
        HttpResponse.json({ error: { code: "not_found", message: "x" } }, { status: 404 }),
      ),
    );
    await open();
    expect(await screen.findByRole("radio", { name: "Largo" })).not.toBeChecked();
  });

  it("a failed save stays on the screen and says so", async () => {
    serve({ horizon: "long" });
    server.use(
      http.put("/api/v1/account/suitability", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    const { router } = await open();
    await user.click(await screen.findByRole("button", { name: "Guardar respuestas" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/perfil/inversor");
  });

  it("a question it cannot render, or a failed load, shows the error state", async () => {
    serve({}, { version: "1", questions: [{ id: "x", kind: "slider", label: "X", options: [] }] });
    await open();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    // Nothing to update on this screen, so no instructions.
    expect(screen.queryByText(/Actualizá tus respuestas/)).toBeNull();
  });
});
