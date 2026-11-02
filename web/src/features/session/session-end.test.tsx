import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/node";
import { rememberStep } from "@/features/onboarding/draft-memory";
import { renderApp } from "@/test/render-app";

// What a session leaves behind: answers, unsaved onboarding steps, and the Idempotency-Keys and
// bodies a mutation keeps in its variables.
async function seedSessionData(queryClient: QueryClient) {
  rememberStep(queryClient, "personal", { name: "Lucía" });
  await queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.resolve(1), gcTime: Infinity })
    .execute({ idempotencyKey: "pending-key", body: { amountCents: 50000 } });
}

function expectNoSessionData(queryClient: QueryClient) {
  expect(queryClient.getQueryCache().findAll({ queryKey: ["session"] })).toEqual([]);
  expect(queryClient.getMutationCache().getAll()).toEqual([]);
}

describe("ending a session clears its data", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("on a 401 session_expired from any request, not just /me", async () => {
    server.use(
      http.get("/api/v1/portfolio", () =>
        HttpResponse.json(
          { error: { code: "session_expired", message: "Session expired" } },
          { status: 401 },
        ),
      ),
    );
    const { router, queryClient } = renderApp({ path: "/cartera" });
    await seedSessionData(queryClient);
    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/sesion-expirada");
      },
      { timeout: 4000 },
    );
    expect(
      await screen.findByRole("button", { name: "Volver a iniciar sesión" }),
    ).toBeInTheDocument();
    expectNoSessionData(queryClient);
  });

  it("on inactivity, when the 15 minutes run out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router, queryClient } = renderApp({ path: "/inicio" });
    await screen.findByRole("heading", { level: 1, name: "Tu cuenta" }, { timeout: 4000 });
    await seedSessionData(queryClient);
    act(() => {
      vi.advanceTimersByTime(15 * 60_000);
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sesion-expirada");
    });
    await waitFor(() => {
      expectNoSessionData(queryClient);
    });
  });

  it("signing in again from the expired screen stays signed in", async () => {
    let answers = 0;
    server.use(
      http.get("/api/v1/portfolio", () => {
        answers += 1;
        return answers === 1
          ? HttpResponse.json(
              { error: { code: "session_expired", message: "Session expired" } },
              { status: 401 },
            )
          : HttpResponse.json({
              totalCents: 0,
              buckets: { investedCents: 0, ibkrCashCents: 0, inFlightCents: 0, feesPaidCents: 0 },
              positions: [],
              asOf: "2026-10-31T06:00:00Z",
            });
      }),
    );
    const { router } = renderApp({ path: "/cartera" });
    const again = await screen.findByRole(
      "button",
      { name: "Volver a iniciar sesión" },
      { timeout: 4000 },
    );
    fireEvent.click(again);
    await screen.findByRole("heading", { level: 1, name: "Tu cuenta" }, { timeout: 4000 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(router.state.location.pathname).toBe("/inicio");
  });

  it("an answer arriving after the session ended writes nothing back", async () => {
    server.use(
      http.get("/api/v1/portfolio", () =>
        HttpResponse.json(
          { error: { code: "session_expired", message: "Session expired" } },
          { status: 401 },
        ),
      ),
    );
    const { router, queryClient } = renderApp({ path: "/cartera" });
    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe("/sesion-expirada");
      },
      { timeout: 4000 },
    );
    act(() => {
      queryClient.setQueryData(["session", "me"], { name: "Lucía" });
    });
    await waitFor(() => {
      expect(queryClient.getQueryData(["session", "me"])).toBeUndefined();
    });
  });
});
