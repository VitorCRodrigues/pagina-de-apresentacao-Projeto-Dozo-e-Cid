import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ApiProvider } from "@/api/ApiProvider";
import { createMockAuthClient, type AuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import type { ScenarioId } from "@/mocks/scenarios";
import { setScenario } from "@/mocks/scenario-state";
import { routes } from "@/router";

interface StoryAppProps {
  path: string;
  scenario?: ScenarioId;
  signedIn?: boolean;
  authClient?: AuthClient;
}

// The real app (routes, providers, MSW handlers) at a URL and mock scenario, for screen stories.
export function StoryApp({
  path,
  scenario = "open",
  signedIn = true,
  authClient = createMockAuthClient({ delayMs: 600 }),
}: StoryAppProps) {
  const [setup] = useState(() => {
    // Pin the scenario before the first request leaves.
    setScenario(scenario);
    return {
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      router: createMemoryRouter(routes, { initialEntries: [path] }),
    };
  });

  return (
    <QueryClientProvider client={setup.queryClient}>
      <AuthProvider
        client={authClient}
        {...(signedIn && { initialSession: { accessToken: "story-token" } })}
      >
        <ApiProvider>
          <RouterProvider router={setup.router} />
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
