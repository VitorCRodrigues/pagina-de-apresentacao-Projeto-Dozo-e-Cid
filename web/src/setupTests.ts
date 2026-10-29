import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import i18n, { defaultLocale } from "@/i18n";
import { server } from "@/mocks/node";
import { DEFAULT_SCENARIO } from "@/mocks/scenarios";
import { setScenario } from "@/mocks/scenario-state";
import { resetMockDb } from "@/mocks/mock-store";

// jsdom lacks the pointer-capture and scroll APIs Radix Select calls when it opens, and the
// ResizeObserver Radix Checkbox measures itself with.
const elementStubs = {
  hasPointerCapture: () => false,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
};
for (const [name, value] of Object.entries(elementStubs)) {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, { value, configurable: true });
  }
}
if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setScenario(DEFAULT_SCENARIO);
  resetMockDb();
  await i18n.changeLanguage(defaultLocale);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
