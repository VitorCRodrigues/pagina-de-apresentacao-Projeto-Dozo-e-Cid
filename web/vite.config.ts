import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// PRD section 9: a restrictive Content-Security-Policy. A <meta> in the built index.html (the
// host's headers are in docs/hosting-headers.md, including what a meta cannot set, such as
// frame-ancestors). Build only: the dev server injects inline scripts for hot reload.
// TODO(decisão): add the KYC SDK and the approved analytics origins once they are chosen.
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' for styles only: Radix locks the page's scroll under a dialog with a <style>
  // it writes at runtime (react-remove-scroll). A nonce cannot live in a static meta, and the
  // content (and so a hash) varies. Scripts stay 'self' only.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function cspMeta(): Plugin {
  return {
    name: "opendollars-csp",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy },
        injectTo: "head-prepend",
      },
    ],
  };
}

// "measure" (npm run build:measure): the production build plus the in-page mock and a session
// already open, so Lighthouse can open each route directly. Its own folder, never dist/.
export default defineConfig(({ mode }) => ({
  // The dev mock answers inside the page (src/mocks/browser.ts): no service worker to serve.
  plugins: [react(), tailwindcss(), cspMeta()],
  build: { outDir: mode === "measure" ? "dist-measure" : "dist" },
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
}));
