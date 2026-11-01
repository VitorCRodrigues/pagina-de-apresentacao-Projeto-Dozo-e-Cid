import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Portfolio", parameters: { frame: false } });

export const Full = meta.story({ render: () => <StoryApp path="/cartera" scenario="open" /> });

export const InFlightOnly = meta.story({
  render: () => <StoryApp path="/cartera" scenario="in_flight_only" />,
});

export const Empty = meta.story({ render: () => <StoryApp path="/cartera" scenario="empty" /> });

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/portfolio", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/cartera" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/portfolio", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/cartera" />,
});
