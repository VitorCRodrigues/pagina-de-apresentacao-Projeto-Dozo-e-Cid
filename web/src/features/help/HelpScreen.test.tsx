import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL } from "@/lib/support";
import { config } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

const files = import.meta.glob<{ default: { help: { questions: Record<string, { a: string }> } } }>(
  "../../i18n/locales/*/profile.json",
  { eager: true },
);

async function open() {
  renderApp({ path: "/perfil/ayuda" });
  await screen.findByRole("heading", { level: 1, name: "Ayuda" }, { timeout: 4000 });
}

const questions = [
  "¿Quién guarda mi dinero?",
  "¿Cuánto cuesta?",
  "¿Por qué hay un mínimo mensual?",
  "¿Por qué se invierte una vez por mes?",
  "¿Cuánto tarda en abrirse la cuenta?",
  "¿Qué hago si envié por la red equivocada?",
  "¿Cómo saco mi dinero?",
];

describe("help (T13)", () => {
  it("lists the questions closed, and one opens at a time", async () => {
    const user = userEvent.setup();
    await open();
    for (const name of questions) {
      expect(await screen.findByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    }
    const first = screen.getByRole("button", { name: questions[0] as string });
    // A question never reads smaller than its answer.
    expect(first.className).toMatch(/\btype-body\b/);
    const second = screen.getByRole("button", { name: questions[1] as string });
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("says who holds the money and how long opening takes", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: questions[0] as string }));
    expect(await screen.findByText(/Interactive Brokers, en una cuenta a tu nombre/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: questions[4] as string }));
    expect(await screen.findByText(/Algunos días hábiles/)).toBeVisible();
  });

  it("takes the minimum and the window day from the config", async () => {
    server.use(
      http.get("/api/v1/config", () =>
        HttpResponse.json({ ...config, minRecurringUsdCents: 40000, investmentWindowDay: 12 }),
      ),
    );
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: questions[2] as string }));
    expect(await screen.findByText(/US\$\s?400,00/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: questions[3] as string }));
    expect(await screen.findByText(/alrededor del día 12/)).toBeVisible();
  });

  // PRD section 10 and decisions.md (1, 11, 17), in all three languages.
  it("promises no return, legality or tax protection, in any language", () => {
    const forbidden =
      /rentabilidad garantizada|rentabilidade garantida|guaranteed return|sin riesgo|sem risco|no risk|herencia|herança|inheritance|sucesi|sucess|es legal|é legal|is legal|minutos|minutes|nunca mezclamos|nunca misturamos|never mix/i;
    const locales = Object.values(files);
    expect(locales).toHaveLength(3);
    for (const file of locales) {
      for (const { a } of Object.values(file.default.help.questions)) {
        expect(a).not.toMatch(forbidden);
      }
    }
  });

  it("offers the support channel", async () => {
    await open();
    expect(await screen.findByText(SUPPORT_EMAIL)).toBeInTheDocument();
    expect(screen.queryByText("Escribinos por e-mail.")).toBeNull();
    expect(screen.getByRole("link", { name: "Escribir a soporte" })).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}`,
    );
  });

  it("does not say money is already in cash at Interactive Brokers before it arrives", () => {
    const answers = Object.values(files).map((file) => file.default.help.questions.window?.a);
    for (const answer of answers) {
      expect(answer).not.toMatch(/queda en caja|fica em caixa|stays as cash/);
    }
  });
});
