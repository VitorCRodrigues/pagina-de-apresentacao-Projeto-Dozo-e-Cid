import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { RadioCard, RadioCardGroup } from "@/components/RadioCard";
import { Select } from "@/components/Select";
import { fundSources, occupations } from "../countries";
import { fundsSchema, type FundsForm } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

// Radio values for the PEP question; the draft stores a boolean.
const PEP_ANSWERS = { yes: "yes", no: "no" } as const;

// The form starts with nothing chosen; the schema refuses that with "required".
const empty = { occupation: "", sourceOfFunds: "", pepRole: "" } as unknown as FundsForm;

function pepValue(isPep: boolean | undefined): string {
  if (isPep === undefined) return "";
  return isPep ? PEP_ANSWERS.yes : PEP_ANSWERS.no;
}

// Step 5. Each question says why we ask it. TODO(compliance): wording pending legal review.
export function FundsStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "funds",
    schema: fundsSchema,
    empty,
    // The office only matters for a PEP; a "No" never keeps an old answer.
    toDraft: ({ pepRole, ...values }) => ({ ...values, ...(values.isPep && { pepRole }) }),
  });
  const { errors } = form.formState;
  const isPep = useWatch({ control: form.control, name: "isPep" });

  const occupationOptions = occupations.map((code) => ({
    value: code,
    label: t(`onboarding.funds.occupations.${code}`),
  }));
  const sourceOptions = fundSources.map((code) => ({
    value: code,
    label: t(`onboarding.funds.sources.${code}`),
  }));

  return (
    <StepPage step="funds" onSubmit={onSubmit} onBack={back} saving={saving} saveError={saveError}>
      <Field label={t("onboarding.funds.occupation")} error={errorText(errors.occupation)}>
        <Controller
          control={form.control}
          name="occupation"
          render={({ field }) => (
            <Select
              options={occupationOptions}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </Field>
      <Field
        label={t("onboarding.funds.source")}
        help={t("onboarding.funds.sourceWhy")}
        error={errorText(errors.sourceOfFunds)}
      >
        <Controller
          control={form.control}
          name="sourceOfFunds"
          render={({ field }) => (
            <Select options={sourceOptions} value={field.value} onValueChange={field.onChange} />
          )}
        />
      </Field>

      <fieldset className="flex flex-col gap-3 border-t border-gray-200 pt-6">
        <legend className="type-heading float-left mb-1 w-full text-navy-900">
          {t("onboarding.funds.pep")}
        </legend>
        <p className="type-caption clear-left text-gray-600">{t("onboarding.funds.pepWhy")}</p>
        <Controller
          control={form.control}
          name="isPep"
          render={({ field }) => (
            <RadioCardGroup
              label={t("onboarding.funds.pep")}
              value={pepValue(field.value)}
              onValueChange={(value) => {
                field.onChange(value === PEP_ANSWERS.yes);
              }}
            >
              <RadioCard value={PEP_ANSWERS.yes} title={t("onboarding.funds.yes")} />
              <RadioCard value={PEP_ANSWERS.no} title={t("onboarding.funds.no")} />
            </RadioCardGroup>
          )}
        />
        {errors.isPep && <p className="type-caption text-brick-700">{errorText(errors.isPep)}</p>}
      </fieldset>

      {isPep && (
        <Field label={t("onboarding.funds.pepRole")} error={errorText(errors.pepRole)}>
          <Input autoComplete="organization-title" {...form.register("pepRole")} />
        </Field>
      )}
    </StepPage>
  );
}
