import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";
import { draftAt, savedSteps } from "./test-helpers";

const titles = [
  "Contrato de asesoría",
  "Divulgación de costos",
  "Política de privacidad",
  "Consentimiento para enviar tus datos a Interactive Brokers",
];

async function open() {
  renderApp({ path: "/onboarding/terminos", scenario: "draft" });
  await screen.findByRole("heading", { name: "Términos y consentimientos" }, { timeout: 4000 });
  return screen.findAllByRole("checkbox");
}

describe("onboarding step 7, terms", () => {
  it("shows one unchecked box per document, each with a link to its text", async () => {
    draftAt("terms");
    const boxes = await open();
    expect(boxes.map((box) => box.getAttribute("aria-checked"))).toEqual([
      "false",
      "false",
      "false",
      "false",
    ]);
    for (const title of titles) {
      expect(screen.getByRole("checkbox", { name: `Acepto: ${title}` })).toBeInTheDocument();
    }
    const links = screen.getAllByRole("link", { name: "Leer el documento" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#terms/advisory_agreement",
      "#terms/cost_disclosure",
      "#terms/privacy_policy",
      "#terms/ibkr_data_consent",
    ]);
  });

  it("asks for explicit consent to send data to Interactive Brokers in the US", async () => {
    draftAt("terms");
    await open();
    expect(screen.getByText(/Interactive Brokers está en Estados Unidos/)).toHaveTextContent(
      "Ley 25.326",
    );
  });

  it("refuses to continue without the IBKR consent", async () => {
    const puts = draftAt("terms");
    const user = userEvent.setup();
    await open();
    for (const title of titles.slice(0, 3)) {
      await user.click(screen.getByRole("checkbox", { name: `Acepto: ${title}` }));
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      await screen.findByText("Para seguir, tenés que aceptar este documento."),
    ).toBeInTheDocument();
    expect(puts).toEqual([]);
  });

  it("saves id, version and acceptedAt for the four documents", async () => {
    const puts = draftAt("terms");
    const user = userEvent.setup();
    await open();
    for (const title of titles) {
      await user.click(screen.getByRole("checkbox", { name: `Acepto: ${title}` }));
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(puts).toHaveLength(1);
    });
    const body = puts[0]?.body as {
      accepted: { id: string; version: string; acceptedAt: string }[];
    };
    expect(body.accepted.map((item) => item.id)).toEqual([
      "terms-advisory",
      "terms-costs",
      "terms-privacy",
      "terms-ibkr-consent",
    ]);
    for (const item of body.accepted) {
      expect(item.version).toBeTruthy();
      expect(Number.isNaN(Date.parse(item.acceptedAt))).toBe(false);
    }
  });

  it("keeps an acceptance saved for the current version", async () => {
    draftAt("review", {
      ...savedSteps,
      terms: {
        accepted: [{ id: "terms-privacy", version: "2026-10", acceptedAt: "2026-10-29T12:00:00Z" }],
      },
    });
    await open();
    expect(
      screen.getByRole("checkbox", { name: "Acepto: Política de privacidad" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("keeps ticked boxes, with their time, across Volver and Continuar", async () => {
    const puts = draftAt("terms");
    const user = userEvent.setup();
    await open();
    for (const title of titles) {
      await user.click(screen.getByRole("checkbox", { name: `Acepto: ${title}` }));
    }
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Términos y consentimientos" });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(puts.map((put) => put.step)).toEqual(["identity", "terms"]);
    });
    const body = puts[1]?.body as { accepted: unknown[] };
    expect(body.accepted).toHaveLength(4);
  });
});
