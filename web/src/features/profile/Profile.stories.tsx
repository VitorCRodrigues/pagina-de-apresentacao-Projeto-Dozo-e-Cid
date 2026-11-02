import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Profile", parameters: { frame: false } });

const failure = () =>
  HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 });
const hang = async () => {
  await delay("infinite");
};

export const Full = meta.story({ render: () => <StoryApp path="/perfil" scenario="open" /> });

export const TermsPending = meta.story({
  render: () => <StoryApp path="/perfil" scenario="terms_update" />,
});

export const Restricted = meta.story({
  render: () => <StoryApp path="/perfil" scenario="restricted" />,
});

export const LogoutDialog = meta.story({
  render: () => <StoryApp path="/perfil" scenario="open" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Cerrar sesión" }));
  },
});

export const SectionError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/me/notifications", failure),
      http.get("/api/v1/account/terms", failure),
    );
  },
  render: () => <StoryApp path="/perfil" />,
});

export const SectionLoading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/me/notifications", hang), http.get("/api/v1/account/terms", hang));
  },
  render: () => <StoryApp path="/perfil" />,
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/me", hang));
  },
  render: () => <StoryApp path="/perfil" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/me", failure));
  },
  render: () => <StoryApp path="/perfil" />,
});

export const SuitabilityForm = meta.story({
  render: () => <StoryApp path="/perfil/inversor" scenario="open" />,
});

export const SuitabilityFirstTime = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/account/suitability", () =>
        HttpResponse.json({ error: { code: "not_found", message: "x" } }, { status: 404 }),
      ),
    );
  },
  render: () => <StoryApp path="/perfil/inversor" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Guardar respuestas" }));
  },
});

export const SuitabilityLoading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/onboarding/questionnaire", hang));
  },
  render: () => <StoryApp path="/perfil/inversor" />,
});

export const SuitabilityError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(http.get("/api/v1/onboarding/questionnaire", failure));
  },
  render: () => <StoryApp path="/perfil/inversor" />,
});
