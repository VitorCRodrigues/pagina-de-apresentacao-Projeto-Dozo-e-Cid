import type { Questionnaire, SuitabilityRecord } from "@/api/proposed-types";
import type { QuestionnaireAnswers } from "@/features/onboarding/schemas";

type SavedAnswers = Pick<SuitabilityRecord, "questionnaireVersion" | "answers">;

export function isCurrent(questionnaire: Questionnaire, saved: SavedAnswers): boolean {
  return saved.questionnaireVersion === questionnaire.version;
}

// Saved answers for the questionnaire as it is today. Another version starts blank: the same id
// may now ask something else, and a suitability record must hold what the client really saw.
// Within a version, questions and options that fell away never go back to the API.
export function answersFor(
  questionnaire: Questionnaire,
  saved: SavedAnswers | undefined,
): QuestionnaireAnswers {
  const answers = saved && isCurrent(questionnaire, saved) ? saved.answers : undefined;
  return Object.fromEntries(
    questionnaire.questions.map((question): [string, string | string[]] => {
      const valid = new Set(question.options.map((option) => option.value));
      const value = answers?.[question.id];
      if (question.kind === "multi") {
        return [
          question.id,
          Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string" && valid.has(item))
            : [],
        ];
      }
      return [question.id, typeof value === "string" && valid.has(value) ? value : ""];
    }),
  );
}
