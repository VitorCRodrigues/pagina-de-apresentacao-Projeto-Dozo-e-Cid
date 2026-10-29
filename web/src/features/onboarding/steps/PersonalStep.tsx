import { useTranslation } from "react-i18next";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { formatCuit, normalizeCuit } from "@/lib/cuit";
import { useOnboardingContext } from "../onboarding-context";
import { personalSchema, type PersonalForm } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

// Step 2. Everything as on the DNI: Interactive Brokers matches it against the document.
export function PersonalStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { me } = useOnboardingContext();
  const empty: PersonalForm = {
    fullName: "",
    birthDate: "",
    dni: "",
    cuil: "",
    email: me.email,
    phone: "",
  };
  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "personal",
    schema: personalSchema,
    empty,
  });
  const { errors } = form.formState;
  const cuil = form.register("cuil", {
    // Shown as 27-30123456-8 once complete; the schema accepts it either way.
    onBlur: (event: { target: { value: string } }) => {
      const digits = normalizeCuit(event.target.value);
      if (/^\d{11}$/.test(digits)) form.setValue("cuil", formatCuit(digits));
    },
  });

  return (
    <StepPage
      step="personal"
      onSubmit={onSubmit}
      onBack={back}
      saving={saving}
      saveError={saveError}
    >
      <Field
        label={t("onboarding.personal.fullName")}
        help={t("onboarding.personal.fullNameHelp")}
        error={errorText(errors.fullName)}
      >
        <Input autoComplete="name" autoCapitalize="words" {...form.register("fullName")} />
      </Field>
      <Field label={t("onboarding.personal.birthDate")} error={errorText(errors.birthDate)}>
        <Input type="date" autoComplete="bday" {...form.register("birthDate")} />
      </Field>
      <Field
        label={t("onboarding.personal.dni")}
        help={t("onboarding.personal.dniHelp")}
        error={errorText(errors.dni)}
      >
        <Input inputMode="numeric" autoComplete="off" {...form.register("dni")} />
      </Field>
      <Field
        label={t("onboarding.personal.cuil")}
        help={t("onboarding.personal.cuilHelp")}
        error={errorText(errors.cuil)}
      >
        <Input inputMode="numeric" autoComplete="off" {...cuil} />
      </Field>
      <Field label={t("onboarding.personal.email")} error={errorText(errors.email)}>
        <Input type="email" inputMode="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field
        label={t("onboarding.personal.phone")}
        help={t("onboarding.personal.phoneHelp")}
        error={errorText(errors.phone)}
      >
        <Input type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
      </Field>
    </StepPage>
  );
}
