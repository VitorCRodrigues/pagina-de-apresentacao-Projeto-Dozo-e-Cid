import { useContext } from "react";
import { identitySchema, type IdentityData } from "../schemas";
import { IdentityProviderContext } from "../identity/identity-provider";
import { IdentityVerification } from "../identity/IdentityVerification";
import { StepPage } from "../StepPage";
import { useErrorText } from "../useErrorText";
import { useStepForm } from "../useStepForm";

// Nothing is approved until the vendor says so; the schema refuses the empty value.
const empty = { reference: "" } as unknown as IdentityData;

// Step 6. The vendor result is the step's whole draft: { status: "approved", reference }.
export function IdentityStep() {
  const provider = useContext(IdentityProviderContext);
  const errorText = useErrorText();
  const { form, onSubmit, back, saving, saveError } = useStepForm({
    step: "identity",
    schema: identitySchema,
    empty,
  });
  const error = form.formState.errors.status ?? form.formState.errors.reference;

  return (
    <StepPage
      step="identity"
      onSubmit={onSubmit}
      onBack={back}
      saving={saving}
      saveError={saveError}
    >
      <IdentityVerification
        provider={provider}
        approved={Boolean(form.getValues("reference"))}
        onResult={(result) => {
          if (result.status !== "approved") return;
          form.setValue("status", "approved");
          form.setValue("reference", result.reference);
          form.clearErrors();
        }}
      />
      {error && <p className="type-caption text-brick-700">{errorText(error)}</p>}
    </StepPage>
  );
}
