import { delay, http, HttpResponse } from "msw";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/Account status", parameters: { frame: false } });

export const Draft = meta.story({ render: () => <StoryApp path="/cuenta" scenario="draft" /> });

export const Submitted = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="submitted" />,
});

export const KycReview = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="kyc_review" />,
});

export const IbkrPending = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="ibkr_pending" />,
});

export const ActionRequired = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="action_required" />,
});

export const Open = meta.story({ render: () => <StoryApp path="/cuenta" scenario="open" /> });

export const Rejected = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="rejected" />,
});

export const Restricted = meta.story({
  render: () => <StoryApp path="/cuenta" scenario="restricted" />,
});

export const Loading = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/account", async () => {
        await delay("infinite");
      }),
    );
  },
  render: () => <StoryApp path="/cuenta" scenario="ibkr_pending" />,
});

export const LoadError = meta.story({
  beforeEach: ({ msw }) => {
    msw.use(
      http.get("/api/v1/account", () =>
        HttpResponse.json({ error: { code: "internal", message: "x" } }, { status: 500 }),
      ),
    );
  },
  render: () => <StoryApp path="/cuenta" scenario="ibkr_pending" />,
});
