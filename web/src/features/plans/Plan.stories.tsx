import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Plan", parameters: { frame: false } });

// No plan yet: the form.
export const Empty = meta.story({ render: () => <StoryApp path="/plan" scenario="empty" /> });

export const BelowMinimum = meta.story({
  render: () => <StoryApp path="/plan" scenario="empty" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Valor por mes"), "200");
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
  },
});

export const Review = meta.story({
  render: () => <StoryApp path="/plan" scenario="empty" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Valor por mes"), "500");
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await canvas.findByRole("button", { name: "Guardar plan" });
  },
});

export const Active = meta.story({ render: () => <StoryApp path="/plan" scenario="open" /> });

export const Paused = meta.story({
  render: () => <StoryApp path="/plan" scenario="plan_paused" />,
});

export const CancelDialog = meta.story({
  render: () => <StoryApp path="/plan" scenario="open" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Cancelar plan" }));
  },
});

export const Editing = meta.story({
  render: () => <StoryApp path="/plan" scenario="open" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Editar plan" }));
  },
});

export const PreviouslyCancelled = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/plans", () =>
        HttpResponse.json([
          { id: "plan-0", amountCents: 30000, dayOfMonth: 5, rail: "ar_usdc", status: "cancelled" },
        ]),
      ),
    );
  },
  render: () => <StoryApp path="/plan" scenario="open" />,
});

export const Restricted = meta.story({
  render: () => <StoryApp path="/plan" scenario="restricted" />,
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/plans", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/plan" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/plans", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/plan" />,
});
