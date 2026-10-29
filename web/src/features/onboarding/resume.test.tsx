import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Calle y número"), "Av. Santa Fe 1000");
  await user.type(screen.getByLabelText("Localidad"), "Buenos Aires");
  await user.click(screen.getByRole("combobox", { name: "Provincia" }));
  await user.click(await screen.findByRole("option", { name: "Ciudad Autónoma de Buenos Aires" }));
  await user.type(screen.getByLabelText("Código postal"), "C1059ABC");
}

describe("onboarding draft and resume", () => {
  it("opening /onboarding resumes at the address step, step 3 of 8", async () => {
    const { router } = renderApp({ path: "/onboarding", scenario: "draft" });
    // The first test pays for the cold lazy import of the onboarding chunk.
    expect(
      await screen.findByRole("heading", { name: "Tu domicilio" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/onboarding/domicilio");
    expect(screen.getByText("Paso 3 de 8")).toBeInTheDocument();
  });

  it("going back shows the saved personal details", async () => {
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/domicilio", scenario: "draft" });
    await user.click(await screen.findByRole("button", { name: "Volver" }));
    expect(await screen.findByLabelText("Nombre completo")).toHaveValue("Lucía Fernández");
  });

  it("keeps what was typed but not saved across Volver and Continuar", async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/onboarding/domicilio", scenario: "draft" });
    await user.type(await screen.findByLabelText("Calle y número"), "Av. Santa Fe 1000");
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await screen.findByLabelText("Nombre completo");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding/domicilio");
    });
    expect(await screen.findByLabelText("Calle y número")).toHaveValue("Av. Santa Fe 1000");
  });

  it("after saving the address, a reload resumes at the investor profile", async () => {
    const user = userEvent.setup();
    const first = renderApp({ path: "/onboarding/domicilio", scenario: "draft" });
    await fillAddress(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(first.router.state.location.pathname).toBe("/onboarding/perfil");
    });

    cleanup();
    const reloaded = renderApp({ path: "/onboarding", scenario: "draft" });
    await waitFor(() => {
      expect(reloaded.router.state.location.pathname).toBe("/onboarding/perfil");
    });
  });

  it("sends a step the client has not reached back to the current one", async () => {
    const { router } = renderApp({ path: "/onboarding/terminos", scenario: "draft" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/onboarding/domicilio");
    });
  });

  it("disables Continuar while the step is being saved", async () => {
    server.use(
      http.put("/api/v1/onboarding/:step", async () => {
        await delay("infinite");
      }),
    );
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/datos", scenario: "draft" });
    const button = await screen.findByRole("button", { name: "Continuar" });
    await user.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it("sends a submitted application from /onboarding to the account status", async () => {
    const { router } = renderApp({ path: "/onboarding", scenario: "submitted" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/cuenta");
    });
  });
});
