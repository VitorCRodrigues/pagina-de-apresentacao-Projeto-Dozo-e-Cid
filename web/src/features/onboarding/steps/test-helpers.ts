import { http, HttpResponse } from "msw";
import type { OnboardingDraft, OnboardingStep } from "@/api/proposed-types";
import { server } from "@/mocks/node";
import { savedSteps } from "../sample-draft";

export { savedSteps, stepsBefore } from "../sample-draft";

// Serves a draft whose current step is `step`, keeping whatever PUT saves afterwards.
export function draftAt(step: OnboardingStep, steps: OnboardingDraft["steps"] = savedSteps) {
  let draft: OnboardingDraft = { currentStep: step, steps };
  const puts: { step: string; body: unknown }[] = [];
  server.use(
    http.get("/api/v1/onboarding", () => HttpResponse.json(draft)),
    http.put("/api/v1/onboarding/:step", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const saved = String(params.step) as OnboardingStep;
      puts.push({ step: saved, body });
      draft = { ...draft, steps: { ...draft.steps, [saved]: body } };
      return HttpResponse.json(draft);
    }),
  );
  return puts;
}
