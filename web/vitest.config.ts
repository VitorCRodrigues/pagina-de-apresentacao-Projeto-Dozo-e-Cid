import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["src/setupTests.ts"],
      restoreMocks: true,
      // Lets src/styles/contrast.test.ts read tokens.css with ?raw instead of a stub.
      css: { include: [/tokens\.css/] },
    },
  }),
);
