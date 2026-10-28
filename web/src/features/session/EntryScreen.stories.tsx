import type { AuthClient } from "@/api/auth";
import preview from "../../../.storybook/preview";
import { StoryApp } from "../../../.storybook/StoryApp";

const meta = preview.meta({ title: "Screens/T1 Entry", parameters: { frame: false } });

const neverResolves: AuthClient = {
  login: () => new Promise(() => undefined),
  logout: () => Promise.resolve(),
};

const failing: AuthClient = {
  login: () => Promise.reject(new Error("provider unavailable")),
  logout: () => Promise.resolve(),
};

export const Default = meta.story({
  render: () => <StoryApp path="/" signedIn={false} />,
});

export const SigningIn = meta.story({
  render: () => <StoryApp path="/" signedIn={false} authClient={neverResolves} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button"));
  },
});

export const SignInFailed = meta.story({
  render: () => <StoryApp path="/" signedIn={false} authClient={failing} />,
  play: async ({ canvas, userEvent }) => {
    const buttons = await canvas.findAllByRole("button");
    const signIn = buttons.at(-1);
    if (signIn) await userEvent.click(signIn);
  },
});

// Country outside liveMarkets, after sign-in.
export const NotAvailable = meta.story({
  render: () => <StoryApp path="/inicio" scenario="market_not_live" />,
});

export const NotAvailableInvalidEmail = meta.story({
  render: () => <StoryApp path="/inicio" scenario="market_not_live" />,
  play: async ({ canvas, userEvent }) => {
    const email = await canvas.findByRole("textbox");
    await userEvent.clear(email);
    await userEvent.type(email, "rafael@");
    await userEvent.click(canvas.getAllByRole("button")[0] as HTMLElement);
  },
});

export const NotAvailableJoined = meta.story({
  render: () => <StoryApp path="/inicio" scenario="market_not_live" />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("textbox");
    await userEvent.click(canvas.getAllByRole("button")[0] as HTMLElement);
  },
});
