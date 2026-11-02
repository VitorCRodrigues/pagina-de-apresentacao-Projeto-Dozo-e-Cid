import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Help", parameters: { frame: false } });

export const Closed = meta.story({ render: () => <StoryApp path="/perfil/ayuda" /> });

export const OneOpen = meta.story({
  render: () => <StoryApp path="/perfil/ayuda" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "¿Qué hago si envié por la red equivocada?" }),
    );
  },
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/config", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/perfil/ayuda" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/config", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/perfil/ayuda" />,
});
