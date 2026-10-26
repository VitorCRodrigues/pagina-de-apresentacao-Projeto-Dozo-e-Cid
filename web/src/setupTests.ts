import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import i18n, { defaultLocale } from "@/i18n";
import { server } from "@/mocks/node";

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

beforeEach(async () => {
  window.localStorage.clear();
  await i18n.changeLanguage(defaultLocale);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
