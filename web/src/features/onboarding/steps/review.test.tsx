import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { lucia } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";
import { draftAt, savedSteps } from "./test-helpers";

const complete = {
  ...savedSteps,
  terms: {
    accepted: ["terms-advisory", "terms-costs", "terms-privacy", "terms-ibkr-consent"].map(
      (id) => ({ id, version: "2026-10", acceptedAt: "2026-10-29T12:00:00Z" }),
    ),
  },
};

async function open() {
  renderApp({ path: "/onboarding/revision", scenario: "draft" });
  await screen.findByRole("heading", { name: "Revisá tu solicitud" }, { timeout: 4000 });
}

function section(name: string) {
  return screen.getByRole("region", { name });
}

describe("onboarding step 8, review and submit", () => {
  it("shows each section with its saved values", async () => {
    draftAt("review", complete);
    await open();
    const personal = await screen.findByRole("region", { name: "Datos personales" });
    expect(within(personal).getByText("Lucía Fernández")).toBeInTheDocument();
    expect(within(personal).getByText("27-30123456-8")).toBeInTheDocument();
    expect(
      within(section("Domicilio")).getByText("Ciudad Autónoma de Buenos Aires"),
    ).toBeInTheDocument();
    const profile = await screen.findByRole("region", { name: "Perfil de inversor" });
    expect(within(profile).getByText("¿Para qué vas a usar este dinero?")).toBeInTheDocument();
    expect(within(profile).getByText("Jubilación")).toBeInTheDocument();
    expect(within(section("Origen de los fondos")).getByText("No")).toBeInTheDocument();
    expect(within(section("Identidad")).getByText("Verificada")).toBeInTheDocument();
    expect(within(section("Términos")).getByText("4 documentos aceptados")).toBeInTheDocument();
    expect(screen.getByText(/Suele tardar algunos días hábiles/)).toBeInTheDocument();
  });

  it("edits a section and comes back to the review", async () => {
    const puts = draftAt("review", complete);
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.click(
      await screen.findByRole("button", { name: "Editar Domicilio" }, { timeout: 4000 }),
    );
    const street = await screen.findByLabelText("Calle y número");
    await user.clear(street);
    await user.type(street, "Av. Callao 500");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding/revision");
    });
    expect(puts.map((put) => put.step)).toEqual(["address"]);
    expect(await screen.findByText("Av. Callao 500")).toBeInTheDocument();
  });

  it("changing the country to one outside the pilot leads to the waitlist", async () => {
    draftAt("review", complete);
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.click(await screen.findByRole("button", { name: "Editar País" }, { timeout: 4000 }));
    await user.click(await screen.findByRole("combobox", { name: "País de residencia" }));
    await user.click(await screen.findByRole("option", { name: "Chile" }));

    expect(
      await screen.findByRole("heading", { name: "Todavía no abrimos cuentas en Chile" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anotarme en la lista" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();
    expect(router.state.location.pathname).toBe("/onboarding/residencia");
  });

  it("submits once, even on a double click, and lands on the account status", async () => {
    draftAt("review", complete);
    let submits = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && request.url.endsWith("/onboarding/submit")) submits += 1;
    });
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.dblClick(
      await screen.findByRole("button", { name: "Enviar solicitud" }, { timeout: 4000 }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/cuenta");
    });
    expect(submits).toBe(1);
    server.events.removeAllListeners();
  });

  it("an application already submitted also lands on the account status", async () => {
    draftAt("review", complete);
    // Another tab already submitted: the server refuses, and /me now says "submitted".
    let refused = false;
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({ ...lucia, accountStatus: refused ? "submitted" : "draft" }),
      ),
      http.post("/api/v1/onboarding/submit", () => {
        refused = true;
        return HttpResponse.json(
          { error: { code: "validation_failed", message: "Already submitted" } },
          { status: 422 },
        );
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.click(
      await screen.findByRole("button", { name: "Enviar solicitud" }, { timeout: 4000 }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/cuenta");
    });
  });

  it("a validation error while still a draft stays on the review and says so", async () => {
    draftAt("review", complete);
    server.use(
      http.post("/api/v1/onboarding/submit", () =>
        HttpResponse.json(
          { error: { code: "validation_failed", message: "Incomplete" } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.click(
      await screen.findByRole("button", { name: "Enviar solicitud" }, { timeout: 4000 }),
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/onboarding/revision");
  });

  it("counts one accepted document in the singular", async () => {
    draftAt("review", { ...savedSteps, terms: { accepted: complete.terms.accepted.slice(0, 1) } });
    await open();
    expect(screen.getByText("1 documento aceptado")).toBeInTheDocument();
  });

  it("Volver while editing a section goes back to the review", async () => {
    draftAt("review", complete);
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/revision", scenario: "draft" });
    await user.click(
      await screen.findByRole("button", { name: "Editar Domicilio" }, { timeout: 4000 }),
    );
    await screen.findByLabelText("Calle y número");
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding/revision");
    });
  });
});
