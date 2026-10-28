import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/App shell", parameters: { frame: false } });

// Account open: five-tab bottom navigation.
export const OpenHome = meta.story({ render: () => <StoryApp path="/inicio" /> });

export const OpenDeposit = meta.story({ render: () => <StoryApp path="/aportar" /> });

// Restricted after opening: navigation stays (decisions.md, item 14).
export const Restricted = meta.story({
  render: () => <StoryApp path="/inicio" scenario="restricted" />,
});

// Before "open": no bottom navigation; /aportar redirects to the account status.
export const PendingAtIbkr = meta.story({
  render: () => <StoryApp path="/aportar" scenario="ibkr_pending" />,
});

export const ActionRequired = meta.story({
  render: () => <StoryApp path="/aportar" scenario="action_required" />,
});

export const Draft = meta.story({
  render: () => <StoryApp path="/aportar" scenario="draft" />,
});

// While /me and /config load (3 s mock latency).
export const Loading = meta.story({
  render: () => <StoryApp path="/inicio" scenario="slow" />,
});

export const ApiError = meta.story({
  render: () => <StoryApp path="/inicio" scenario="server_error" />,
});
