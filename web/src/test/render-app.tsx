import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ApiProvider } from "@/api/ApiProvider";
import { createMockAuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import type { ScenarioId } from "@/mocks/scenarios";
import { setScenario } from "@/mocks/scenario-state";
import { routes } from "@/router";

interface RenderAppOptions {
  path?: string;
  signedIn?: boolean;
  scenario?: ScenarioId;
}

// The real route tree, providers and MSW handlers, at a given URL and mock scenario.
export function renderApp({
  path = "/",
  signedIn = true,
  scenario = "open",
}: RenderAppOptions = {}) {
  setScenario(scenario);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        client={createMockAuthClient({ delayMs: 0 })}
        {...(signedIn && { initialSession: { accessToken: "test-token" } })}
      >
        <ApiProvider>
          <RouterProvider router={router} />
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );

  return { router, queryClient };
}
