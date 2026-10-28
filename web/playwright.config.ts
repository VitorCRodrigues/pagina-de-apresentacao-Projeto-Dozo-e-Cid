import { defineConfig, devices } from "@playwright/test";

const port = 5173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The Vite dev server stalls when four browsers cold-load it at once (seen on Windows);
  // two workers stay fast and reliable.
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
