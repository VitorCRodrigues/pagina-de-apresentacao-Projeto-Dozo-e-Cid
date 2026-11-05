import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApiClient } from "@/api/client";
import { uploadDocument } from "@/api/endpoints";
import { startMocking } from "./browser";
import { server } from "./node";
import { setScenario } from "./scenario-state";

// The app's mock in the page: the same handlers as the tests' server, without a service worker.
describe("startMocking", () => {
  let stop: (() => void) | null = null;
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // The tests' msw/node server patches the same globals; this suite runs without it.
    server.close();
  });
  afterEach(() => {
    stop?.();
    stop = null;
  });
  afterAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  const api = createApiClient({ getToken: () => "test-token", getLocale: () => "es" });

  it("answers fetch requests with the mock handlers", async () => {
    stop = startMocking();
    const response = await fetch(`${window.location.origin}/api/v1/health`);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers the multipart upload over XMLHttpRequest and reports its progress", async () => {
    setScenario("action_required");
    stop = startMocking();
    const account = await api.request("GET", "/account", { response: "account" });
    const item = account.pending.find((p) => p.kind === "document");
    expect(item).toBeDefined();

    const progress: number[] = [];
    const file = new File([new Uint8Array(200_000)], "dni.pdf", { type: "application/pdf" });
    const updated = await uploadDocument(api, item?.id ?? "", file, (fraction) => {
      progress.push(fraction);
    });

    expect(updated?.pending.some((p) => p.id === item?.id)).toBe(false);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress.at(-1)).toBe(1);
  });

  it("gives fetch back when stopped", () => {
    startMocking()();
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it("never stops the app from starting when the old worker cannot be listed", async () => {
    const { removeOldMockWorker } = await import("./browser");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistrations: () => Promise.reject(new DOMException("blocked", "SecurityError")),
      },
    });
    await expect(removeOldMockWorker()).resolves.toBeUndefined();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });
});
