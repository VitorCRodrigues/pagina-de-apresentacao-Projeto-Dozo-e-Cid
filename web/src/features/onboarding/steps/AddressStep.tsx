import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { provinceCodes, provinces } from "../countries";
import { addressSchema, type AddressForm } from "../schemas";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

const provinceOptions = provinceCodes.map((code) => ({ value: code, label: provinces[code] }));

// The schema's input lets province start empty; the select only offers real codes.
const empty = {
  street: "",
  unit: "",
  city: "",
  province: "",
  postalCode: "",
} as unknown as AddressForm;

// Step 3. Argentina only: other countries never get past step 1.
export function AddressStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "address",
    schema: addressSchema,
    empty,
  });
  const { errors } = form.formState;

  return (
    <StepPage
      step="address"
      onSubmit={onSubmit}
      onBack={back}
      saving={saving}
      saveError={saveError}
    >
      <Field label={t("onboarding.address.street")} error={errorText(errors.street)}>
        <Input autoComplete="address-line1" {...form.register("street")} />
      </Field>
      <Field label={t("onboarding.address.unit")} optional error={errorText(errors.unit)}>
        <Input autoComplete="address-line2" {...form.register("unit")} />
      </Field>
      <Field label={t("onboarding.address.city")} error={errorText(errors.city)}>
        <Input autoComplete="address-level2" {...form.register("city")} />
      </Field>
      <Field label={t("onboarding.address.province")} error={errorText(errors.province)}>
        <Controller
          control={form.control}
          name="province"
          render={({ field }) => (
            <Select options={provinceOptions} value={field.value} onValueChange={field.onChange} />
          )}
        />
      </Field>
      <Field
        label={t("onboarding.address.postalCode")}
        help={t("onboarding.address.postalCodeHelp")}
        error={errorText(errors.postalCode)}
      >
        <Input
          autoComplete="postal-code"
          autoCapitalize="characters"
          {...form.register("postalCode")}
        />
      </Field>
    </StepPage>
  );
}
