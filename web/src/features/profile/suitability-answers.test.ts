import { describe, expect, it } from "vitest";
import type { Questionnaire } from "@/api/proposed-types";
import { answersFor, isCurrent } from "./suitability-answers";

const questionnaire: Questionnaire = {
  version: "2",
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
    {
      id: "goals",
      kind: "multi",
      label: "Objetivos",
      options: [
        { value: "retire", label: "Retiro" },
        { value: "house", label: "Casa" },
      ],
    },
  ],
};

const saved = (answers: Record<string, unknown>, questionnaireVersion = "2") => ({
  questionnaireVersion,
  answers,
});

describe("answersFor", () => {
  it("keeps saved answers that still exist", () => {
    expect(
      answersFor(questionnaire, saved({ horizon: "long", goals: ["retire", "house"] })),
    ).toEqual({
      horizon: "long",
      goals: ["retire", "house"],
    });
  });

  it("drops options the questionnaire no longer has", () => {
    expect(
      answersFor(questionnaire, saved({ horizon: "gone", goals: ["retire", "gone"] })),
    ).toEqual({
      horizon: "",
      goals: ["retire"],
    });
  });

  it("drops removed questions and starts new ones empty", () => {
    expect(answersFor(questionnaire, saved({ removed: "x" }))).toEqual({ horizon: "", goals: [] });
  });

  it("starts empty when they answered another version: the same id may ask something else", () => {
    expect(isCurrent(questionnaire, saved({ horizon: "long" }, "1"))).toBe(false);
    expect(answersFor(questionnaire, saved({ horizon: "long" }, "1"))).toEqual({
      horizon: "",
      goals: [],
    });
    expect(isCurrent(questionnaire, saved({ horizon: "long" }))).toBe(true);
  });

  it("starts empty without saved answers", () => {
    expect(answersFor(questionnaire, undefined)).toEqual({ horizon: "", goals: [] });
  });

  it("ignores a value of the wrong type", () => {
    expect(answersFor(questionnaire, saved({ horizon: ["long"], goals: "retire" }))).toEqual({
      horizon: "",
      goals: [],
    });
  });
});
