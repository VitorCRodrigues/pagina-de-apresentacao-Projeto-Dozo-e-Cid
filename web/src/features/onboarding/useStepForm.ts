import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import type { z } from "zod";
import { useSaveOnboardingStep } from "@/api/hooks/onboarding";
import type { OnboardingStep } from "@/api/proposed-types";
import { paths } from "@/routes";
import { forgetStep, recallStep, rememberStep } from "./draft-memory";
import { useOnboardingContext } from "./onboarding-context";
import { nextStep, previousStep } from "./steps";

interface StepFormOptions<In extends FieldValues, Out extends Record<string, unknown>> {
  step: OnboardingStep;
  schema: z.ZodType<Out, In>;
  empty: In;
  // Draft body and form values, when they differ (terms, questionnaire).
  toDraft?: (values: Out) => Record<string, unknown>;
  fromDraft?: (saved: Record<string, unknown>) => Partial<In>;
}

export interface ReturnState {
  returnTo?: "review";
}

// One onboarding step: defaults from the unsaved memory or the server draft, validation with
// the step schema, PUT /onboarding/{step}, then the next step (or back to the review).
export function useStepForm<In extends FieldValues, Out extends Record<string, unknown>>({
  step,
  schema,
  empty,
  toDraft,
  fromDraft,
}: StepFormOptions<In, Out>) {
  const { draft } = useOnboardingContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const save = useSaveOnboardingStep();
  const returnTo = (location.state as ReturnState | null)?.returnTo;

  // Read once, when the step mounts: later draft updates must not reset what is being typed.
  const [defaultValues] = useState(() => {
    const saved = draft.steps[step];
    const remembered = recallStep(queryClient, step) as Partial<In> | undefined;
    return {
      ...empty,
      ...(saved && (fromDraft ? fromDraft(saved) : (saved as Partial<In>))),
      ...remembered,
    } as DefaultValues<In>;
  });

  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const data = toDraft ? toDraft(values) : values;
    try {
      await save.mutateAsync({ step, data });
    } catch {
      return; // save.error drives the error note
    }
    forgetStep(queryClient, step);
    const target = returnTo === "review" ? "review" : (nextStep(step) ?? "review");
    void navigate(paths.onboardingStep(target));
  });

  // Editing from the review, Volver goes back to it; otherwise to the previous step.
  const previous = returnTo === "review" ? "review" : previousStep(step);
  const back = previous
    ? () => {
        rememberStep(queryClient, step, form.getValues());
        void navigate(paths.onboardingStep(previous));
      }
    : undefined;

  return {
    form,
    onSubmit,
    back,
    saving: save.isPending || form.formState.isSubmitting,
    saveError: save.error,
  };
}
