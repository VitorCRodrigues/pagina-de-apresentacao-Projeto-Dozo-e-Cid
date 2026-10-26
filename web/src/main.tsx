import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/i18n";
import "@/styles/index.css";

async function enableMocking() {
  // The DEV guard lets Vite drop the mocks (and msw) from the production bundle.
  if (!import.meta.env.DEV) return;
  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass" });
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
