import { useId, type SyntheticEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/api/error-messages";
import type { OnboardingStep } from "@/api/proposed-types";
import { Banner } from "@/components/Banner";
import { WizardFooter } from "./WizardFooter";

interface StepPageProps {
  step: OnboardingStep;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
  onBack?: (() => void) | undefined;
  saving: boolean;
  saveError: unknown;
  primaryLabel?: string;
  // false hides the footer: the waitlist ends the assistant with its own action.
  footer?: boolean;
  children: ReactNode;
  // Rendered after the form, for content that must not sit inside it (another form).
  after?: ReactNode;
}

// One step of the assistant: the question as the title, a short lead, the fields, and the
// fixed footer with Continuar.
export function StepPage({
  step,
  onSubmit,
  onBack,
  saving,
  saveError,
  primaryLabel,
  footer = true,
  children,
  after,
}: StepPageProps) {
  const { t } = useTranslation();
  const formId = useId();

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="type-title text-navy-900">{t(`onboarding.${step}.title`)}</h1>
        <p className="type-body text-gray-600">{t(`onboarding.${step}.lead`)}</p>
      </header>
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="flex flex-col gap-6"
      >
        {children}
        {saveError != null && <Banner tone="error" title={t(errorMessageKey(saveError))} />}
      </form>
      {after}
      {footer && (
        <WizardFooter
          formId={formId}
          onBack={onBack}
          pending={saving}
          {...(primaryLabel && { primaryLabel })}
        />
      )}
    </div>
  );
}
