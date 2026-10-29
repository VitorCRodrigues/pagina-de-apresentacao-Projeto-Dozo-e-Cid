import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { describe, expect, it } from "vitest";
import type { Questionnaire } from "@/api/proposed-types";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";
import { draftAt } from "./test-helpers";

const custom: Questionnaire = {
  version: "legal-7",
  questions: [
    {
      id: "horizonte",
      kind: "single",
      label: "¿Cuándo vas a necesitar el dinero?",
      options: [
        { value: "pronto", label: "En menos de 3 años" },
        { value: "tarde", label: "En más de 3 años" },
      ],
    },
    {
      id: "productos",
      kind: "multi",
      label: "¿Qué productos conocés?",
      options: [
        { value: "bonos", label: "Bonos" },
        { value: "cedears", label: "CEDEARs" },
      ],
    },
  ],
};

function serve(questionnaire: JsonBodyType) {
  server.use(http.get("/api/v1/onboarding/questionnaire", () => HttpResponse.json(questionnaire)));
}

async function open() {
  renderApp({ path: "/onboarding/perfil", scenario: "draft" });
  return screen.findByRole("heading", { name: "Tu perfil de inversor" }, { timeout: 4000 });
}

describe("onboarding step 4, investor profile", () => {
  it("renders the API questions, in the API order, and nothing else", async () => {
    draftAt("suitability", {});
    serve(custom);
    await open();
    // The Stepper is a group too; the questions are the fieldsets.
    const groups = (await screen.findAllByRole("group")).filter((g) => g.tagName === "FIELDSET");
    const legends = groups.map((group) => group.querySelector("legend")?.textContent);
    expect(legends).toEqual(["¿Cuándo vas a necesitar el dinero?", "¿Qué productos conocés?"]);
    expect(screen.queryByText("¿Para qué vas a usar este dinero?")).toBeNull();
  });

  it("asks for an answer on the multiple-choice question left empty", async () => {
    const puts = draftAt("suitability", {});
    serve(custom);
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("radio", { name: "En más de 3 años" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const multi = screen.getByRole("group", { name: "¿Qué productos conocés?" });
    expect(await within(multi).findByText("Completá este dato.")).toBeInTheDocument();
    expect(puts).toEqual([]);
  });

  it("saves the questionnaire version with the answers", async () => {
    const puts = draftAt("suitability", {});
    serve(custom);
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("radio", { name: "En menos de 3 años" }));
    await user.click(screen.getByRole("checkbox", { name: "CEDEARs" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(puts).toEqual([
        {
          step: "suitability",
          body: {
            questionnaireVersion: "legal-7",
            answers: { horizonte: "pronto", productos: ["cedears"] },
          },
        },
      ]);
    });
  });

  it("shows the error state when a question cannot be drawn", async () => {
    draftAt("suitability", {});
    serve({ ...custom, questions: [{ id: "x", kind: "slider", label: "X", options: [] }] });
    renderApp({ path: "/onboarding/perfil", scenario: "draft" });
    expect(
      await screen.findByRole("button", { name: "Reintentar" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();
  });
});
