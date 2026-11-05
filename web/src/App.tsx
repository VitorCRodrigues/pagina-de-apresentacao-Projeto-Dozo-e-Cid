import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { RouterProvider } from "react-router";
import { ApiProvider } from "@/api/ApiProvider";
import { createMockAuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import { createQueryClient } from "@/api/queryClient";
import { createRouter } from "@/router";

// TODO(decisão): swap the mock for the real OIDC client once the provider is chosen.
const authClient = createMockAuthClient();

// The Lighthouse build (MODE "measure") opens every route directly, so it starts signed in.
// A constant in any other build: production never has a session it did not sign in for.
const measureSession =
  import.meta.env.MODE === "measure" ? { accessToken: "measure-session" } : undefined;

// Development only: Vite turns import.meta.env.DEV into false in production builds, which
// drops this branch and the dynamic import with it.
const ScenarioSwitcher = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import("@/mocks/ScenarioSwitcher")).ScenarioSwitcher }))
  : null;

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createRouter);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={authClient} {...(measureSession && { initialSession: measureSession })}>
        <ApiProvider>
          <RouterProvider router={router} />
          {ScenarioSwitcher && (
            <Suspense fallback={null}>
              <ScenarioSwitcher />
            </Suspense>
          )}
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
