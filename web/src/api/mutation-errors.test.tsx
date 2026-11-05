import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { server } from "@/mocks/node";
import type { ScenarioId } from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

type User = ReturnType<typeof userEvent.setup>;
type Method = "post" | "patch" | "put";

interface Mutation {
  name: string;
  method: Method;
  route: string;
  path: string;
  scenario: ScenarioId;
  act: (user: User) => Promise<void>;
}

const click = (user: User, name: string | RegExp) => async () => {
  await user.click(await screen.findByRole("button", { name }, { timeout: 4000 }));
};

async function toPreview(user: User) {
  await user.type(await screen.findByLabelText("Valor en dólares", {}, { timeout: 4000 }), "500");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "¿Cómo vas a enviar el dinero?" });
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Revisá tu aporte" });
}

// Every mutation the client can trigger, and how to trigger it.
const mutations: Mutation[] = [
  {
    name: "pause the plan",
    method: "patch",
    route: "/api/v1/plans/:id",
    path: "/plan",
    scenario: "open",
    act: async (user) => click(user, "Pausar plan")(),
  },
  {
    name: "cancel the plan",
    method: "patch",
    route: "/api/v1/plans/:id",
    path: "/plan",
    scenario: "open",
    act: async (user) => {
      await click(user, "Cancelar plan")();
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Cancelar plan" }));
    },
  },
  {
    name: "create the plan",
    method: "post",
    route: "/api/v1/plans",
    path: "/plan",
    scenario: "empty",
    act: async (user) => {
      await user.type(await screen.findByLabelText("Valor por mes", {}, { timeout: 4000 }), "500");
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      await click(user, "Guardar plan")();
    },
  },
  {
    name: "ask for a quote",
    method: "post",
    route: "/api/v1/deposits/quote",
    path: "/aportar/nuevo",
    scenario: "open",
    act: async (user) => {
      await user.type(
        await screen.findByLabelText("Valor en dólares", {}, { timeout: 4000 }),
        "500",
      );
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    },
  },
  {
    name: "confirm the deposit",
    method: "post",
    route: "/api/v1/deposits",
    path: "/aportar/nuevo",
    scenario: "open",
    act: async (user) => {
      await toPreview(user);
      await click(user, "Confirmar aporte")();
    },
  },
  {
    name: "save the investor profile",
    method: "put",
    route: "/api/v1/account/suitability",
    path: "/perfil/inversor",
    scenario: "open",
    act: async (user) => click(user, "Guardar respuestas")(),
  },
  {
    name: "accept new terms",
    method: "post",
    route: "/api/v1/account/terms/:id/accept",
    path: "/pendientes",
    scenario: "terms_update",
    act: async (user) => {
      await click(user, "Revisar y aceptar")();
      const dialog = await screen.findByRole("dialog");
      await user.click(await within(dialog).findByRole("link", { name: /Leer el documento/ }));
      await user.click(within(dialog).getByRole("checkbox"));
      await user.click(within(dialog).getByRole("button", { name: "Aceptar" }));
    },
  },
  {
    name: "send a document",
    method: "post",
    route: "/api/v1/account/documents",
    path: "/cuenta",
    scenario: "action_required",
    act: async (user) => {
      const input = (await screen.findAllByLabelText("Elegir archivo", {}, { timeout: 4000 }))[0];
      if (!input) throw new Error("No file input");
      await user.upload(input, new File(["%PDF"], "dni.pdf", { type: "application/pdf" }));
      await click(user, "Enviar documento")();
    },
  },
  {
    name: "tell support the money was sent",
    method: "post",
    route: "/api/v1/deposits/:id/sent-notice",
    path: "/aportar/dep-scenario",
    scenario: "deposit_notified",
    act: async (user) => click(user, "Ya envié")(),
  },
];

const codes = [
  { code: "account_restricted", status: 409 },
  { code: "validation_failed", status: 422 },
  { code: "rate_limited", status: 429 },
  { code: "maintenance", status: 503 },
] as const;

const generic = () => i18n.t("errors.internal");

function refuse(mutation: Mutation, response: () => Response) {
  server.use(http[mutation.method](mutation.route, response));
}

describe("a mutation the server refuses with a known code says what the code means", () => {
  describe.each(mutations)("$name", (mutation) => {
    it.each(codes)("$code", async ({ code, status }) => {
      refuse(mutation, () =>
        HttpResponse.json({ error: { code, message: "refused" } }, { status }),
      );
      const user = userEvent.setup();
      renderApp({ path: mutation.path, scenario: mutation.scenario });
      await mutation.act(user);
      expect(await screen.findByText(i18n.t(`errors.${code}`))).toBeVisible();
      expect(screen.queryByText(generic())).toBeNull();
    });
  });

  it("an answer that is not the API's (no JSON) stays the generic error", async () => {
    const [pause] = mutations;
    if (!pause) throw new Error("No mutation");
    refuse(pause, () => new HttpResponse("<html>Not found</html>", { status: 404 }));
    const user = userEvent.setup();
    renderApp({ path: pause.path, scenario: pause.scenario });
    await pause.act(user);
    expect(await screen.findByText(generic())).toBeVisible();
  });
});
