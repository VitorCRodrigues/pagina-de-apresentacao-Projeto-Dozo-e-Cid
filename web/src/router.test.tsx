import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { accountStatuses } from "@/api/schemas";
import type { AccountStatus } from "@/api/types";
import { landingPathFor } from "@/features/session/account-routing";
import { renderApp } from "@/test/render-app";

describe("routing by account status", () => {
  it("keeps a client in ibkr_pending out of /aportar", async () => {
    const { router } = renderApp({ path: "/aportar", scenario: "ibkr_pending" });

    expect(
      await screen.findByRole("heading", { name: "Interactive Brokers está analizando tu cuenta" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/cuenta");
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).toBeNull();
  });

  it.each(accountStatuses.filter((s) => s !== "open" && s !== "restricted"))(
    "sends %s from /aportar to its pre-open screen, without bottom navigation",
    async (status: AccountStatus) => {
      const { router } = renderApp({ path: "/aportar", scenario: status });
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(landingPathFor(status));
      });
      expect(screen.queryByRole("navigation", { name: "Navegación principal" })).toBeNull();
    },
  );

  it.each(["open", "restricted"] as const)(
    "lets %s reach /aportar with the five-tab navigation",
    async (status) => {
      const { router } = renderApp({ path: "/aportar", scenario: status });

      const nav = await screen.findByRole("navigation", { name: "Navegación principal" });
      const links = within(nav).getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual([
        "Inicio",
        "Aportar",
        "Cartera",
        "Pendientes",
        "Perfil",
      ]);
      expect(within(nav).getByRole("link", { name: "Aportar" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(router.state.location.pathname).toBe("/aportar");
    },
  );

  it("sends an opened account away from onboarding to /inicio", async () => {
    const { router } = renderApp({ path: "/onboarding", scenario: "open" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/inicio");
    });
  });

  it("sends a signed-out visitor from a protected route to the entry screen", async () => {
    const { router } = renderApp({ path: "/cartera", signedIn: false });
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("entry and global screens", () => {
  it("signs in from T1 and lands on the client's home", async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/", signedIn: false, scenario: "open" });

    expect(
      await screen.findByRole("heading", {
        name: "Tu cuenta de inversión en dólares, con aportes mensuales.",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/inicio");
    });
  });

  it("offers the waitlist when the country is not live, and accepts an email", async () => {
    const user = userEvent.setup();
    renderApp({ path: "/inicio", scenario: "market_not_live" });

    expect(
      await screen.findByRole("heading", { name: "Todavía no está disponible en tu país" }),
    ).toBeInTheDocument();
    const email = screen.getByRole("textbox", { name: "E-mail" });
    expect(email).toHaveValue("rafael.souza@example.com");

    await user.clear(email);
    await user.type(email, "no-es-un-email");
    await user.click(screen.getByRole("button", { name: "Anotarme en la lista" }));
    expect(await screen.findByText(/Escribí un e-mail válido/)).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");

    await user.clear(email);
    await user.type(email, "rafa@example.com");
    await user.click(screen.getByRole("button", { name: "Anotarme en la lista" }));
    expect(await screen.findByText(/Te vamos a escribir a rafa@example.com/)).toBeInTheDocument();
  });

  it("shows the maintenance screen when the API is down for maintenance", async () => {
    const { router } = renderApp({ path: "/inicio", scenario: "maintenance" });
    expect(
      await screen.findByRole("heading", { name: "Estamos haciendo mantenimiento" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/mantenimiento");
    expect(screen.getByText(/El acceso vuelve a las \d{2}:\d{2}\./)).toBeInTheDocument();
  });

  it("offers a retry when the API fails", async () => {
    renderApp({ path: "/inicio", scenario: "server_error" });
    expect(
      await screen.findByRole("heading", { name: "No pudimos cargar esta información" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("shows the session-expired screen and ends the session there", async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: "/sesion-expirada" });

    expect(await screen.findByRole("heading", { name: "Tu sesión se cerró" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Volver a iniciar sesión" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/inicio");
    });
  });

  it("shows a 404 for unknown paths", async () => {
    renderApp({ path: "/no-existe" });
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir al inicio" })).toBeInTheDocument();
  });
});
