import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { createMockAuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import { SessionTimeout } from "./SessionTimeout";

function setup() {
  const router = createMemoryRouter(
    [
      { path: "/inicio", element: <SessionTimeout /> },
      { path: "/sesion-expirada", element: <p>expired</p> },
      { path: "/", element: <p>entry</p> },
    ],
    { initialEntries: ["/inicio"] },
  );
  render(
    <AuthProvider
      client={createMockAuthClient({ delayMs: 0 })}
      initialSession={{ accessToken: "t" }}
    >
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("SessionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse("2026-10-28T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks one minute before the limit and keeps the session on request", () => {
    const router = setup();
    advance(14 * 60_000);

    const dialog = screen.getByRole("dialog", { name: "¿Seguís ahí?" });
    expect(dialog).toHaveTextContent("1:00");

    act(() => {
      screen.getByRole("button", { name: "Seguir conectado" }).click();
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.state.location.pathname).toBe("/inicio");
  });

  it("sends the client to the session-expired screen at 15 minutes", () => {
    const router = setup();
    advance(15 * 60_000);
    expect(router.state.location.pathname).toBe("/sesion-expirada");
  });

  it("signs out from the warning", () => {
    const router = setup();
    advance(14 * 60_000);
    act(() => {
      screen.getByRole("button", { name: "Cerrar sesión" }).click();
    });
    expect(router.state.location.pathname).toBe("/");
  });
});
