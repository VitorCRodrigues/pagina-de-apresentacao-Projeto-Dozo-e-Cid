import preview from "../../../../.storybook/preview";
import { createMockIdentityProvider, type IdentityProvider } from "./identity-provider";
import { IdentityVerification } from "./IdentityVerification";

const meta = preview.meta({
  title: "Onboarding/IdentityVerification",
  component: IdentityVerification,
});

const failing: IdentityProvider = {
  start: ({ onResult }) => {
    onResult({ status: "failed", reason: "error" });
    return () => undefined;
  },
};

// Never answers, so the running state stays on screen.
const pending: IdentityProvider = { start: () => () => undefined };

export const Idle = meta.story({
  args: { provider: createMockIdentityProvider(), onResult: () => undefined },
});

export const Running = meta.story({
  args: { provider: pending, onResult: () => undefined },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Empezar la verificación" }));
  },
});

export const Approved = meta.story({
  args: { provider: createMockIdentityProvider(), onResult: () => undefined, approved: true },
});

export const Failed = meta.story({
  args: { provider: failing, onResult: () => undefined },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Empezar la verificación" }));
  },
});
