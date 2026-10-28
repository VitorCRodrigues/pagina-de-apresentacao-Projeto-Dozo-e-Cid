import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createMockAuthClient, type AuthClient } from "./auth";
import { useAuth } from "./auth-context";
import { AuthProvider } from "./AuthProvider";

function storedValues(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, i) =>
    storage.getItem(storage.key(i) ?? ""),
  ).join("|");
}

function setup(client: AuthClient = createMockAuthClient({ delayMs: 0 })) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider client={client}>{children}</AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("AuthProvider", () => {
  it("signs in and out, keeping the token in memory only", async () => {
    const { result } = setup();
    expect(result.current.status).toBe("signedOut");
    expect(result.current.getAccessToken()).toBeNull();

    await act(() => result.current.login());
    expect(result.current.status).toBe("signedIn");
    const token = result.current.getAccessToken();
    expect(token).toMatch(/^mock-/);
    expect(storedValues(localStorage)).not.toContain(token);
    expect(storedValues(sessionStorage)).not.toContain(token);
    expect(document.cookie).not.toContain(token);

    await act(() => result.current.logout());
    expect(result.current.status).toBe("signedOut");
    expect(result.current.getAccessToken()).toBeNull();
  });

  it("goes back to signed out when the provider fails", async () => {
    const failing: AuthClient = {
      login: () => Promise.reject(new Error("denied")),
      logout: () => Promise.resolve(),
    };
    const { result } = setup(failing);

    await act(async () => {
      await expect(result.current.login()).rejects.toThrow("denied");
    });
    expect(result.current.status).toBe("signedOut");
  });
});
