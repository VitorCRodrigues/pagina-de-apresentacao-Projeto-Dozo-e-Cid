import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { errorMessageKey } from "@/api/error-messages";
import { isApiError } from "@/api/errors";
import { useSaveSuitability, useSuitability } from "@/api/hooks/account";
import { useQuestionnaire } from "@/api/hooks/onboarding";
import type { Questionnaire, SuitabilityRecord } from "@/api/proposed-types";
import { ActionBar } from "@/components/ActionBar";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/PageState";
import { canRender } from "@/features/onboarding/question-guard";
import { QuestionField } from "@/features/onboarding/QuestionField";
import { questionnaireAnswersSchema } from "@/features/onboarding/schemas";
import { useErrorText } from "@/features/onboarding/useErrorText";
import { paths } from "@/routes";
import type { ProfileLocationState } from "./ProfileScreen";
import { answersFor, isCurrent } from "./suitability-answers";

// T12: the questionnaire of onboarding step 4, outside onboarding. Questions come from the API.
export function SuitabilityScreen() {
  const { t } = useTranslation("profile");
  const questionnaire = useQuestionnaire();
  const saved = useSuitability();
  // No answers saved yet is a normal start, not a failure.
  const savedFailed =
    saved.isError && !saved.data && !(isApiError(saved.error) && saved.error.code === "not_found");

  let body;
  let ready = false;
  // Only with nothing to show: a failed background refresh must not take the form away.
  if ((questionnaire.isError && !questionnaire.data) || savedFailed) {
    body = (
      <ErrorState
        onRetry={() => {
          void questionnaire.refetch();
          void saved.refetch();
        }}
      />
    );
  } else if (!questionnaire.data || saved.isPending) {
    body = <LoadingState />;
  } else if (!questionnaire.data.questions.every(canRender)) {
    body = <ErrorState onRetry={() => void questionnaire.refetch()} />;
  } else {
    ready = true;
    body = <SuitabilityForm questionnaire={questionnaire.data} saved={saved.data} />;
  }

  return (
    <section className="flex flex-col gap-8 py-2 pb-24">
      <header className="flex flex-col gap-3">
        <h1 className="type-title text-navy-900">{t("profile.suitability.title")}</h1>
        {ready && (
          // TODO(compliance): what a new answer changes in the portfolio is not defined yet.
          <p className="type-body max-w-prose text-gray-600">{t("profile.suitability.intro")}</p>
        )}
      </header>
      {body}
    </section>
  );
}

function SuitabilityForm({
  questionnaire,
  saved,
}: {
  questionnaire: Questionnaire;
  saved: SuitabilityRecord | undefined;
}) {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const errorText = useErrorText();
  const formId = useId();
  const save = useSaveSuitability();
  const schema = useMemo(() => questionnaireAnswersSchema(questionnaire), [questionnaire]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: answersFor(questionnaire, saved),
  });

  const missing = Object.keys(form.formState.errors).length;

  const submit = form.handleSubmit((answers) => {
    save.mutate(
      { questionnaireVersion: questionnaire.version, answers },
      {
        onSuccess: () => {
          const state: ProfileLocationState = { suitabilitySaved: true };
          void navigate(paths.profile, { state });
        },
      },
    );
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-8"
    >
      {saved && !isCurrent(questionnaire, saved) && (
        <Banner title={t("profile.suitability.changed")} quiet />
      )}
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
      {missing > 0 && (
        <Banner tone="error" title={t("profile.suitability.missing", { count: missing })} />
      )}
      {save.error != null && <Banner tone="error" title={t(errorMessageKey(save.error))} />}
      <ActionBar>
        <Button
          variant="ghost"
          fullWidth="never"
          disabled={save.isPending}
          onClick={() => void navigate(paths.profile)}
        >
          {t("profile.suitability.back")}
        </Button>
        <Button
          type="submit"
          form={formId}
          fullWidth="never"
          className="flex-1"
          loading={save.isPending}
        >
          {t("profile.suitability.save")}
        </Button>
      </ActionBar>
    </form>
  );
}
