import { BatchInterceptor } from "@mswjs/interceptors";
import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest";
import { getResponse } from "msw";
import { handlers } from "./handlers";
import { currentScenario } from "./scenario-state";

// Read ?scenario= now: the first API request may only happen after navigation drops the query.
currentScenario();

// The same MSW handlers, answered inside the page instead of by a service worker. Chrome
// restarts an idle service worker after a few minutes, and MSW's worker comes back without the
// tabs it served, so every request fell through to the dev server (404, "internal"). Nothing
// here can be stopped by the browser. fetch for the API, XMLHttpRequest for uploads with progress.
export function startMocking(): () => void {
  const interceptor = new BatchInterceptor({
    name: "opendollars-mock",
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });

  interceptor.on("request", async ({ request, controller }) => {
    try {
      const response = await getResponse(handlers, request);
      if (response) controller.respondWith(response);
    } catch (error) {
      // A handler bug answers like a server bug would, instead of hanging the request.
      console.error("[mock] handler failed", request.method, new URL(request.url).pathname, error);
      controller.respondWith(
        Response.json(
          { error: { code: "internal", message: "Mock handler failed" } },
          { status: 500 },
        ),
      );
    }
  });

  interceptor.apply();
  return () => {
    interceptor.dispose();
  };
}

// Browsers that ran the old service worker mock keep it registered; it would only pass
// requests through now, but it has no reason to stay.
export async function removeOldMockWorker(): Promise<void> {
  // Absent outside secure contexts (a LAN address over http), though the types say otherwise.
  if (!("serviceWorker" in navigator)) return;
  // Best effort: some browsers refuse to list workers (privacy modes); the app starts anyway.
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.active?.scriptURL.endsWith("/mockServiceWorker.js"))
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Nothing to clean up that we can reach.
  }
}
