import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { useQuestionnaire } from "@/api/hooks/onboarding";
import type { Questionnaire } from "@/api/proposed-types";
import { ErrorState, LoadingState } from "@/components/PageState";
import { canRender } from "../question-guard";
import { QuestionField } from "../QuestionField";
import { questionnaireAnswersSchema, type QuestionnaireAnswers } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

// Step 4. Questions come from GET /onboarding/questionnaire so legal can change them without a
// deploy (PRD T2); nothing about them is fixed here.
export function SuitabilityStep() {
  const questionnaire = useQuestionnaire();
  if (questionnaire.isPending) return <LoadingState />;
  if (questionnaire.isError || !questionnaire.data.questions.every(canRender)) {
    return <ErrorState onRetry={() => void questionnaire.refetch()} />;
  }
  return <SuitabilityForm questionnaire={questionnaire.data} />;
}

function SuitabilityForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const errorText = useErrorText();
  const schema = useMemo(() => questionnaireAnswersSchema(questionnaire), [questionnaire]);
  const empty = useMemo<QuestionnaireAnswers>(
    () =>
      Object.fromEntries(questionnaire.questions.map((q) => [q.id, q.kind === "multi" ? [] : ""])),
    [questionnaire],
  );

  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "suitability",
    schema,
    empty,
    toDraft: (answers) => ({ questionnaireVersion: questionnaire.version, answers }),
    fromDraft: (saved) => (saved.answers ?? {}) as QuestionnaireAnswers,
  });

  return (
    <StepPage
      step="suitability"
      onSubmit={onSubmit}
      onBack={back}
      saving={saving}
      saveError={saveError}
    >
      <div className="flex flex-col gap-8">
        {questionnaire.questions.map((question) => (
          <Controller
            key={question.id}
            control={form.control}
            name={question.id}
            render={({ field, fieldState }) => (
              <QuestionField
                question={question}
                value={field.value}
                onChange={field.onChange}
                error={errorText(fieldState.error)}
              />
            )}
          />
        ))}
      </div>
    </StepPage>
  );
}
