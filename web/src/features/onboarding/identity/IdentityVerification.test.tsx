import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render-app";
import { draftAt, stepsBefore } from "../steps/test-helpers";
import { createMockIdentityProvider, type IdentityProvider } from "./identity-provider";
import { IdentityVerification } from "./IdentityVerification";

afterEach(() => {
  vi.useRealTimers();
});

describe("mock identity provider", () => {
  it("approves after 2000 ms, not before", () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    createMockIdentityProvider().start({ locale: "es", onResult });
    vi.advanceTimersByTime(1999);
    expect(onResult).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onResult.mock.calls[0]?.[0]).toMatchObject({ status: "approved" });
  });

  it("never reports after its cleanup ran", () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    const cleanup = createMockIdentityProvider().start({ locale: "es", onResult });
    cleanup();
    vi.advanceTimersByTime(5000);
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("IdentityVerification", () => {
  it("goes from the intro to running to approved", () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    render(<IdentityVerification provider={createMockIdentityProvider()} onResult={onResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Empezar la verificación" }));
    expect(screen.getByText("Estamos verificando tu identidad.")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Tu identidad está verificada.")).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("stops the vendor flow when it unmounts mid-check", async () => {
    const cleanup = vi.fn();
    const provider: IdentityProvider = { start: vi.fn(() => cleanup) };
    const onResult = vi.fn();
    const user = userEvent.setup();
    const view = render(<IdentityVerification provider={provider} onResult={onResult} />);
    await user.click(screen.getByRole("button", { name: "Empezar la verificación" }));
    view.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(onResult).not.toHaveBeenCalled();
  });

  it("offers a retry when the check fails", async () => {
    const provider: IdentityProvider = {
      start: ({ onResult }) => {
        onResult({ status: "failed", reason: "error" });
        return () => undefined;
      },
    };
    const user = userEvent.setup();
    render(<IdentityVerification provider={provider} onResult={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Empezar la verificación" }));
    expect(
      screen.getByText("No pudimos completar la verificación. Probá de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});

describe("onboarding step 6", () => {
  const beforeIdentity = stepsBefore("identity");

  it("needs the verification before Continuar, then saves the approval", async () => {
    const puts = draftAt("identity", beforeIdentity);
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/identidad", scenario: "draft" });

    await user.click(await screen.findByRole("button", { name: "Continuar" }, { timeout: 4000 }));
    expect(await screen.findByText("Completá la verificación para seguir.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Empezar la verificación" }));
    expect(
      await screen.findByText("Tu identidad está verificada.", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => {
      expect(puts[0]).toMatchObject({ step: "identity", body: { status: "approved" } });
    });
  });
});
