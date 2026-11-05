import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { i18nReady } from "@/i18n";
import "@/styles/index.css";

async function enableMocking() {
  // Vite replaces both with constants, so a production build drops the mocks (and msw).
  // "measure" is the Lighthouse build (vite.config.ts), never deployed.
  if (!import.meta.env.DEV && import.meta.env.MODE !== "measure") return;
  const { removeOldMockWorker, startMocking } = await import("@/mocks/browser");
  await removeOldMockWorker();
  startMocking();
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// The detected language's common texts load before the first render: no raw keys on screen.
void Promise.all([enableMocking(), i18nReady]).then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
