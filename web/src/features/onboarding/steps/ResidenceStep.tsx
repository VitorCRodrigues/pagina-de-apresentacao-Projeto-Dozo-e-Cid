import { useMemo } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Banner } from "@/components/Banner";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { WaitlistForm } from "@/features/session/WaitlistForm";
import { asLocale, toIntlLocale } from "@/lib/locale";
import { countryOptions } from "../countries";
import { useOnboardingContext } from "../onboarding-context";
import { residenceSchema, type ResidenceForm } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

const empty: ResidenceForm = { country: "", nationality: "" };

// Step 1. A country outside config.liveMarkets ends the assistant with the waitlist.
export function ResidenceStep() {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const { me, config } = useOnboardingContext();
  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "residence",
    schema: residenceSchema,
    empty,
  });

  const intlLocale = toIntlLocale(asLocale(i18n.language));
  const options = useMemo(() => countryOptions(intlLocale), [intlLocale]);

  const country = useWatch({ control: form.control, name: "country" });
  const live = !country || (config.liveMarkets as readonly string[]).includes(country);
  const countryName = options.find((option) => option.value === country)?.label ?? country;
  const { errors } = form.formState;

  return (
    <StepPage
      step="residence"
      onSubmit={onSubmit}
      onBack={back}
      saving={saving}
      saveError={saveError}
      footer={live}
      after={
        !live && (
          <section className="flex flex-col gap-4 border-t border-gray-200 pt-6">
            <h2 className="type-heading text-navy-900">
              {t("onboarding.residence.waitlistTitle", { country: countryName })}
            </h2>
            <p className="type-body text-gray-600">{t("onboarding.residence.waitlistBody")}</p>
            <WaitlistForm key={country} defaultEmail={me.email} country={country} />
          </section>
        )
      }
    >
      <Field label={t("onboarding.residence.country")} error={errorText(errors.country)}>
        <Controller
          control={form.control}
          name="country"
          render={({ field }) => (
            <Select options={options} value={field.value} onValueChange={field.onChange} />
          )}
        />
      </Field>
      <Field label={t("onboarding.residence.nationality")} error={errorText(errors.nationality)}>
        <Controller
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <Select options={options} value={field.value} onValueChange={field.onChange} />
          )}
        />
      </Field>
      {live && <Banner tone="info" title={t("custody.note")} />}
    </StepPage>
  );
}
