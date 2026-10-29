import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useParams } from "react-router";
import { useConfig } from "@/api/hooks/config";
import { useMe } from "@/api/hooks/account";
import { useOnboarding } from "@/api/hooks/onboarding";
import { onboardingSteps, type OnboardingStep } from "@/api/proposed-types";
import { ErrorState, LoadingState } from "@/components/PageState";
import { Stepper } from "@/components/Stepper";
import { paths } from "@/routes";
import { OnboardingContext, useOnboardingContext } from "./onboarding-context";
import { canVisit, resumeStep, stepFromSlug } from "./steps";
import { AddressStep } from "./steps/AddressStep";
import { FundsStep } from "./steps/FundsStep";
import { IdentityStep } from "./steps/IdentityStep";
import { PersonalStep } from "./steps/PersonalStep";
import { ResidenceStep } from "./steps/ResidenceStep";
import { ReviewStep } from "./steps/ReviewStep";
import { SuitabilityStep } from "./steps/SuitabilityStep";
import { TermsStep } from "./steps/TermsStep";

const stepComponents: Record<OnboardingStep, ComponentType> = {
  residence: ResidenceStep,
  personal: PersonalStep,
  address: AddressStep,
  suitability: SuitabilityStep,
  funds: FundsStep,
  identity: IdentityStep,
  terms: TermsStep,
  review: ReviewStep,
};

// T2. Loads the server draft once; every step reads it from context. Only a draft account
// fills the assistant: after submitting, the client follows the account status.
export function OnboardingLayout() {
  const { data: me } = useMe();
  const config = useConfig();
  const onboarding = useOnboarding();

  if (me && me.accountStatus !== "draft") return <Navigate to={paths.accountStatus} replace />;
  if (onboarding.error) return <ErrorState onRetry={() => void onboarding.refetch()} />;
  if (!me || !config.data || !onboarding.data) return <LoadingState />;

  return (
    <OnboardingContext value={{ draft: onboarding.data, me, config: config.data }}>
      <Outlet />
    </OnboardingContext>
  );
}

// /onboarding: straight to the step the client left off.
export function OnboardingResume() {
  const { draft } = useOnboardingContext();
  return <Navigate to={paths.onboardingStep(resumeStep(draft))} replace />;
}

// /onboarding/:slug. A step not reached yet (or unknown) goes back to the current one.
export function OnboardingStepRoute() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { draft } = useOnboardingContext();
  const step = stepFromSlug(slug);

  if (!step || !canVisit(step, draft)) {
    return <Navigate to={paths.onboardingStep(resumeStep(draft))} replace />;
  }

  const Step = stepComponents[step];
  return (
    <div className="flex flex-col gap-8">
      <Stepper
        steps={onboardingSteps.map((s) => t(`onboarding.steps.${s}`))}
        current={onboardingSteps.indexOf(step)}
      />
      <Step key={step} />
    </div>
  );
}
