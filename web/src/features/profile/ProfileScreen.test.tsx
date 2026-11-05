import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { rememberStep } from "@/features/onboarding/draft-memory";
import { config, lucia } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { SUPPORT_EMAIL } from "@/lib/support";
import { renderApp } from "@/test/render-app";

async function open(scenario: ScenarioId = "open") {
  const view = renderApp({ path: "/perfil", scenario });
  await screen.findByRole("heading", { level: 1, name: "Perfil" }, { timeout: 4000 });
  return view;
}

const section = (name: string) => screen.findByRole("region", { name });
const failure = () =>
  HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 });

// Every body sent to a route, in order.
function spy(method: string, path: string): unknown[] {
  const bodies: unknown[] = [];
  server.events.on("request:start", ({ request }) => {
    if (request.method === method && new URL(request.url).pathname === path) {
      void request
        .clone()
        .json()
        .then((body: unknown) => bodies.push(body));
    }
  });
  return bodies;
}

describe("profile (T12)", () => {
  it("a restricted account explains the restriction, as Início and Plan do (decision 14)", async () => {
    await open("restricted");
    expect(await screen.findByText("Tu cuenta necesita atención.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hablar con soporte" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });

  it("Cerrar sesión is a neutral navy outline, not a green link", async () => {
    await open();
    const logout = await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(logout).toHaveClass("border-navy-900", "text-navy-900");
    expect(logout).not.toHaveClass("text-green-700");
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("goes from what the client comes for to what rarely changes", async () => {
    await open();
    await screen.findByRole("region", { name: "Preferencias" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Tus datos",
      "Tu inversión",
      "Retiros y extractos",
      "Documentos y términos",
      "Preferencias",
      "Otros servicios",
    ]);
  });

  it("shows personal data read-only, with changes going through support", async () => {
    await open();
    const data = await section("Tus datos");
    expect(data).toHaveTextContent(lucia.name);
    expect(data).toHaveTextContent(lucia.email);
    expect(data).toHaveTextContent("Argentina");
    expect(await within(data).findByText("U****4821")).toBeInTheDocument();
    expect(within(data).queryByRole("textbox")).toBeNull();
    expect(within(data).getByRole("link", { name: "Escribir a soporte" })).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}`,
    );
  });

  it("saves the language on the account and on the device", async () => {
    const bodies = spy("PATCH", "/api/v1/me");
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("radio", { name: "Português" }));
    expect(await screen.findByRole("region", { name: "Seus dados" })).toBeInTheDocument();
    await waitFor(() => {
      expect(bodies).toEqual([{ locale: "pt" }]);
    });
    expect(window.localStorage.getItem("od.locale.choice")).toBe("pt");
  });

  it("goes back to the previous language when the account refuses it", async () => {
    server.use(http.patch("/api/v1/me", failure));
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("radio", { name: "Português" }));
    expect(await screen.findByText("No pudimos guardar el idioma. Probá de nuevo.")).toBeVisible();
    expect(i18n.resolvedLanguage).toBe("es");
    expect(window.localStorage.getItem("od.locale.choice")).toBeNull();
  });

  it("undoes a refused language even if the client already left the screen", async () => {
    server.use(
      http.patch("/api/v1/me", async () => {
        await delay(200);
        return failure();
      }),
    );
    const user = userEvent.setup();
    const { router } = await open();
    await user.click(await screen.findByRole("radio", { name: "Português" }));
    await router.navigate("/cartera");
    await waitFor(
      () => {
        expect(i18n.resolvedLanguage).toBe("es");
      },
      { timeout: 2000 },
    );
    expect(window.localStorage.getItem("od.locale.choice")).toBeNull();
  });

  it("says so when an earlier toggle fails, even if a later one succeeds", async () => {
    // The e-mail answer fails only once the push toggle has been sent: the earlier toggle is
    // still in flight when the later one starts, whatever the machine's speed.
    let pushSent: () => void = () => undefined;
    const pushArrived = new Promise<void>((resolve) => {
      pushSent = resolve;
    });
    server.use(
      http.patch("/api/v1/me/notifications", async ({ request }) => {
        const body = (await request.json()) as Record<string, boolean>;
        if ("email" in body) {
          await pushArrived;
          await delay(50);
          return failure();
        }
        pushSent();
        return HttpResponse.json({ email: true, push: true });
      }),
    );
    const user = userEvent.setup();
    await open();
    const push = await screen.findByRole("checkbox", { name: /dispositivo/ });
    const email = screen.getByRole("checkbox", { name: "Avisos por e-mail" });
    await user.click(email);
    await user.click(push);
    expect(await screen.findByText(/No pudimos guardar el cambio/)).toBeVisible();
    await waitFor(() => {
      expect(email).toBeChecked();
    });
  });

  it("sends only the notification that changed, and two toggles send one field each", async () => {
    const bodies = spy("PATCH", "/api/v1/me/notifications");
    const user = userEvent.setup();
    await open();
    const push = await screen.findByRole("checkbox", { name: /dispositivo/ });
    const email = screen.getByRole("checkbox", { name: "Avisos por e-mail" });
    expect(push).not.toBeChecked();
    await user.click(push);
    await user.click(email);
    await waitFor(() => {
      expect(bodies).toEqual([{ push: true }, { email: false }]);
    });
    expect(push).toBeChecked();
    expect(email).not.toBeChecked();
  });

  it("brings the box back and says so when saving a notification fails", async () => {
    server.use(http.patch("/api/v1/me/notifications", failure));
    const user = userEvent.setup();
    await open();
    const push = await screen.findByRole("checkbox", { name: /dispositivo/ });
    await user.click(push);
    expect(await screen.findByText(/No pudimos guardar el cambio/)).toBeVisible();
    await waitFor(() => {
      expect(push).not.toBeChecked();
    });
  });

  it("links to the plan, the investor profile and help", async () => {
    await open();
    expect(await screen.findByRole("link", { name: "Plan mensual" })).toHaveAttribute(
      "href",
      "/plan",
    );
    expect(screen.getByRole("link", { name: /Perfil de inversor/ })).toHaveAttribute(
      "href",
      "/perfil/inversor",
    );
    expect(screen.getByRole("link", { name: "Ayuda" })).toHaveAttribute("href", "/perfil/ayuda");
    expect(await screen.findByText(/Última actualización: /)).toBeInTheDocument();
  });

  it("lists accepted terms with name, version and date", async () => {
    await open();
    const terms = await section("Documentos y términos");
    const list = await within(terms).findByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveTextContent(/Versión octubre de 2026/);
    expect(rows[0]).toHaveTextContent(/Aceptado el /);
  });

  it("a new version pending keeps the older acceptance and links to Pendientes", async () => {
    await open("terms_update");
    const terms = await section("Documentos y términos");
    await within(terms).findByRole("list");
    expect(terms).toHaveTextContent(/versión noviembre de 2026 para aceptar/);
    expect(within(terms).getByRole("link", { name: "Ver pendientes" })).toHaveAttribute(
      "href",
      "/pendientes",
    );
    expect(terms).not.toHaveTextContent(/Versión noviembre de 2026/);
    expect(terms).toHaveTextContent(/Versión octubre de 2026/);
    // What needs the client comes before the record of what is done.
    const note = within(terms).getByRole("status");
    const list = within(terms).getByRole("list");
    expect(note.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("withdrawals only link out to Interactive Brokers, with no form or credential field", async () => {
    await open();
    const box = await section("Retiros y extractos");
    expect(box).toHaveTextContent(/cuenta bancaria a tu nombre/);
    const link = await within(box).findByRole("link", { name: /Ir a Interactive Brokers/ });
    expect(link).toHaveAttribute("href", config.ibkrPortalUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByLabelText(/usuario|contraseña|password/i)).toBeNull();
  });

  it("tax reports and debit card are visible but do nothing", async () => {
    await open();
    const soon = await section("Otros servicios");
    for (const name of [/Reportes fiscales/, /Tarjeta de débito/]) {
      const item = within(soon).getByRole("link", { name });
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).not.toHaveAttribute("href");
      expect(item).toHaveTextContent("Próximamente");
    }
    expect(soon.querySelector("a, button")).toBeNull();
  });

  it("signing out asks first; going back keeps the session", async () => {
    const user = userEvent.setup();
    const { router } = await open();
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    const dialog = await screen.findByRole("dialog", { name: "¿Cerrar sesión?" });
    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(router.state.location.pathname).toBe("/perfil");
  });

  it("signing out leaves the entry screen and no session data in memory", async () => {
    const user = userEvent.setup();
    const { router, queryClient } = await open();
    rememberStep(queryClient, "personal", { name: "Lucía" });
    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.resolve(1), gcTime: Infinity })
      .execute({ idempotencyKey: "pending-key" });
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    await waitFor(() => {
      expect(queryClient.getQueryCache().findAll({ queryKey: ["session"] })).toEqual([]);
    });
    expect(queryClient.getMutationCache().getAll()).toEqual([]);
  });

  it("a section that fails stays alone, with its own retry", async () => {
    server.use(http.get("/api/v1/me/notifications", failure));
    await open();
    const box = await section("Preferencias");
    const retry = await within(box).findByRole("button", { name: "Reintentar" });
    // A text link at the start of the line, not stretched across the section.
    expect(retry.className).not.toMatch(/\bw-full\b/);
    expect(await section("Tus datos")).toHaveTextContent(lucia.name);
  });

  it("loading: skeleton in a section that waits", async () => {
    server.use(
      http.get("/api/v1/account/terms", async () => {
        await delay("infinite");
      }),
    );
    await open();
    const terms = await section("Documentos y términos");
    const status = within(terms).getByRole("status");
    // Same hairlines as when loaded, so the section does not jump.
    expect(status.parentElement?.className).toMatch(/\bborder-y\b/);
  });
});
