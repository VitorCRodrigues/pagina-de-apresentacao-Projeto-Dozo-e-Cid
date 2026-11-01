import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Home", parameters: { frame: false } });

export const Full = meta.story({ render: () => <StoryApp path="/inicio" scenario="open" /> });

// A deposit waiting on the client: the pending strip and a deposit in progress.
export const WithPending = meta.story({
  render: () => <StoryApp path="/inicio" scenario="deposit_notified" />,
});

export const InFlightOnly = meta.story({
  render: () => <StoryApp path="/inicio" scenario="in_flight_only" />,
});

export const Empty = meta.story({ render: () => <StoryApp path="/inicio" scenario="empty" /> });

export const Restricted = meta.story({
  render: () => <StoryApp path="/inicio" scenario="restricted" />,
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    const hang = async () => {
      await delay("infinite");
    };
    msw.use(
      http.get("/api/v1/portfolio", hang),
      http.get("/api/v1/plans", hang),
      http.get("/api/v1/deposits", hang),
    );
  },
  render: () => <StoryApp path="/inicio" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/portfolio", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/inicio" />,
});
