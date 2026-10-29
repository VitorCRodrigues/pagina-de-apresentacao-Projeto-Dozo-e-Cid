import { delay, http, HttpResponse } from "msw";
import type { OnboardingDraft, OnboardingStep } from "@/api/proposed-types";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";
import { acceptedTerms, savedSteps, stepsBefore } from "./sample-draft";
import { stepSlugs } from "./steps";

const meta = preview.meta({ title: "Screens/Onboarding", parameters: { frame: false } });

// Serves a draft at `step`; PUT keeps working against it so Continuar moves on.
function draftAt(step: OnboardingStep, steps: OnboardingDraft["steps"] = stepsBefore(step)) {
  let draft: OnboardingDraft = { currentStep: step, steps };
  return [
    http.get("/api/v1/onboarding", () => HttpResponse.json(draft)),
    http.put("/api/v1/onboarding/:step", async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      draft = { ...draft, steps: { ...draft.steps, [String(params.step)]: body } };
      return HttpResponse.json(draft);
    }),
  ];
}

const at = (step: OnboardingStep) => (
  <StoryApp path={`/onboarding/${stepSlugs[step]}`} scenario="draft" />
);

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/onboarding", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/onboarding" scenario="draft" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/onboarding", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/onboarding" scenario="draft" />,
});

export const Residence = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("residence", {}));
  },
  render: () => at("residence"),
});

// Step 1 with a country outside the pilot: the assistant ends with the waitlist.
export const ResidenceWaitlist = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("residence", { residence: { country: "UY", nationality: "UY" } }));
  },
  render: () => at("residence"),
});

export const Personal = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("personal"));
  },
  render: () => at("personal"),
});

export const PersonalErrors = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      ...draftAt("personal", {
        ...stepsBefore("personal"),
        personal: {
          ...savedSteps.personal,
          fullName: "Lucía",
          cuil: "27301234560",
          birthDate: "2010-01-01",
        },
      }),
    );
  },
  render: () => at("personal"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Continuar" }));
  },
});

export const Address = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("address"));
  },
  render: () => at("address"),
});

export const AddressErrors = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("address"));
  },
  render: () => at("address"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Continuar" }));
  },
});

export const Suitability = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("suitability"));
  },
  render: () => at("suitability"),
});

export const SuitabilityErrors = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("suitability"));
  },
  render: () => at("suitability"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Continuar" }));
  },
});

export const Funds = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("funds"));
  },
  render: () => at("funds"),
});

export const FundsPep = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("funds"));
  },
  render: () => at("funds"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "Sí" }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  },
});

export const Identity = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("identity"));
  },
  render: () => at("identity"),
});

export const IdentityApproved = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("identity", { ...stepsBefore("identity"), identity: savedSteps.identity }));
  },
  render: () => at("identity"),
});

export const Terms = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("terms"));
  },
  render: () => at("terms"),
});

export const TermsErrors = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("terms"));
  },
  render: () => at("terms"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Continuar" }));
  },
});

export const Review = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(...draftAt("review", { ...savedSteps, terms: acceptedTerms }));
  },
  render: () => at("review"),
});

export const ReviewSubmitError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      ...draftAt("review", { ...savedSteps, terms: acceptedTerms }),
      http.post("/api/v1/onboarding/submit", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => at("review"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Enviar solicitud" }));
  },
});
