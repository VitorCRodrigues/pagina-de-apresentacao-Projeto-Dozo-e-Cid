import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { msw } from "msw/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Serves mockServiceWorker.js in dev only; "serve" keeps it out of every build.
    { ...msw({ mode: "worker-only" }), apply: "serve" },
  ],
  // Scan every screen at startup, lazy routes included. Otherwise the dev server finds a
  // dependency on the first visit to a route (uqr in the deposit detail), re-optimizes and
  // reloads the page, which ends the in-memory session mid-flow.
  optimizeDeps: {
    entries: ["index.html", "src/**/*.tsx", "!src/**/*.test.tsx", "!src/**/*.stories.tsx"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
