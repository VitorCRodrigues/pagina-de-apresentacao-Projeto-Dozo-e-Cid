import { defineMain } from "@storybook/react-vite/node";
import { msw } from "msw/vite";

export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["msw-storybook-addon"],
  core: { disableTelemetry: true },
  viteFinal(config, { configType }) {
    // The app config serves the MSW worker only in dev; a static Storybook needs it emitted too.
    if (configType === "PRODUCTION") {
      config.plugins = [...(config.plugins ?? []), msw({ mode: "worker-only" })];
    }
    return config;
  },
});
