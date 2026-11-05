import { defineMain } from "@storybook/react-vite/node";
import { msw } from "msw/vite";

export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["msw-storybook-addon"],
  core: { disableTelemetry: true },
  viteFinal(config) {
    // Stories keep MSW's service worker (short sessions): served in dev, emitted in a static build.
    // The app itself mocks inside the page (src/mocks/browser.ts) and serves no worker.
    // The app's CSP meta (vite.config.ts) is for the app: Storybook's iframe runs inline scripts.
    const plugins = (config.plugins ?? []).filter(
      (plugin) =>
        !(
          plugin &&
          typeof plugin === "object" &&
          "name" in plugin &&
          plugin.name === "opendollars-csp"
        ),
    );
    config.plugins = [...plugins, msw({ mode: "worker-only" })];
    return config;
  },
});
