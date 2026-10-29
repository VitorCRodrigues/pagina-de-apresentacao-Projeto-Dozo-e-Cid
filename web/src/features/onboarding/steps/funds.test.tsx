import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";
import { draftAt, stepsBefore } from "./test-helpers";

const beforeFunds = stepsBefore("funds");

async function open() {
  renderApp({ path: "/onboarding/fondos", scenario: "draft" });
  await screen.findByRole("heading", { name: "Origen de los fondos" }, { timeout: 4000 });
}

async function choose(user: ReturnType<typeof userEvent.setup>, field: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("onboarding step 5, source of funds and PEP", () => {
  it("explains why it asks about the money and about public office", async () => {
    draftAt("funds", beforeFunds);
    await open();
    expect(
      screen.getByText(
        "Lo preguntamos porque la ley nos pide conocer el origen del dinero que se invierte.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/normas de prevención de lavado de dinero/)).toBeInTheDocument();
  });

  it("asks for the office only after Sí, and requires it then", async () => {
    const puts = draftAt("funds", beforeFunds);
    const user = userEvent.setup();
    await open();
    await choose(user, "Ocupación", "Jubilado");
    await choose(user, "¿De dónde viene el dinero que vas a invertir?", "Ahorros");
    expect(screen.queryByLabelText("¿Qué cargo ocupás u ocupaste?")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Sí" }));
    const role = await screen.findByLabelText("¿Qué cargo ocupás u ocupaste?");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Completá este dato.")).toBeInTheDocument();
    expect(puts).toEqual([]);

    await user.type(role, "Concejal");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(puts[0]?.body).toEqual({
        occupation: "retired",
        sourceOfFunds: "savings",
        isPep: true,
        pepRole: "Concejal",
      });
    });
  });
});
