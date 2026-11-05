import { defineConfig, devices } from "@playwright/test";

const port = 5173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Two workers locally. Measured on the 8-thread, 16 GB Windows laptop (04/11): with four,
  // the whole machine stalls (an idle probe's 1 s timer fired 8-19 s late, and the dev server
  // dropped connections), so page.goto passes 30 s and sign-in tests fail. With two, three cold
  // starts in a row passed 42/42. Not a server or app bug: do not raise the timeouts for it.
  workers: process.env.CI ? 1 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      // Mobile-first: 375 px is the reference width (web/CLAUDE.md).
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
  ],
  // Dev server, because MSW only runs there.
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
