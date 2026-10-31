import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ApiProvider } from "@/api/ApiProvider";
import { createMockAuthClient } from "@/api/auth";
import { AuthProvider } from "@/api/AuthProvider";
import { useQuote } from "@/api/hooks/deposits";
import type { Quote } from "@/api/types";
import { server } from "@/mocks/node";
import { useConfirmDeposit } from "./useConfirmDeposit";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        client={createMockAuthClient({ delayMs: 0 })}
        initialSession={{ accessToken: "t" }}
      >
        <ApiProvider>{children}</ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const quote = (id: string): Quote => ({
  id,
  amountCents: 50000,
  options: [],
  expiresAt: "2099-01-01T00:00:00Z",
});

// Records every POST /deposits key; the first `failures` calls fail at the network level.
function recordDeposits({ failures = 0 } = {}) {
  const keys: (string | null)[] = [];
  server.use(
    http.post("/api/v1/deposits", ({ request }) => {
      keys.push(request.headers.get("Idempotency-Key"));
      if (keys.length <= failures) return HttpResponse.error();
      return HttpResponse.json(
        {
          id: "dep-new",
          rail: "ar_usdc",
          state: "deposit_notified",
          amountCents: 50000,
          costs: [],
          history: [{ state: "deposit_notified", at: "2026-10-31T12:00:00Z" }],
          createdAt: "2026-10-31T12:00:00Z",
          isFirstDeposit: false,
        },
        { status: 201 },
      );
    }),
  );
  return keys;
}

describe("confirming a deposit", () => {
  it("two confirms in a row send a single POST", async () => {
    const keys = recordDeposits();
    const { result } = renderHook(() => useConfirmDeposit(quote("q-1"), "ar_usdc"), { wrapper });
    await act(async () => {
      await Promise.all([result.current.confirm(), result.current.confirm()]);
    });
    expect(keys).toHaveLength(1);
  });

  it("sends nothing more once the deposit exists, even before the screen moves on", async () => {
    const keys = recordDeposits();
    const { result } = renderHook(() => useConfirmDeposit(quote("q-1"), "ar_usdc"), { wrapper });
    await act(async () => {
      await result.current.confirm();
    });
    await act(async () => {
      expect(await result.current.confirm()).toBeNull();
    });
    expect(keys).toHaveLength(1);
  });

  it("a retry after a network error resends the same key", async () => {
    const keys = recordDeposits({ failures: 1 });
    const { result } = renderHook(() => useConfirmDeposit(quote("q-1"), "ar_usdc"), { wrapper });
    await act(async () => {
      await result.current.confirm();
    });
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    await act(async () => {
      await result.current.confirm();
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it("a new quote is a new intention, with a new key", async () => {
    const keys = recordDeposits({ failures: 1 });
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useConfirmDeposit(quote(id), "ar_usdc"),
      { wrapper, initialProps: { id: "q-1" } },
    );
    await act(async () => {
      await result.current.confirm();
    });
    rerender({ id: "q-2" });
    await act(async () => {
      await result.current.confirm();
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("does nothing without a quote", async () => {
    const keys = recordDeposits();
    const { result } = renderHook(() => useConfirmDeposit(null, "ar_usdc"), { wrapper });
    await act(async () => {
      expect(await result.current.confirm()).toBeNull();
    });
    expect(keys).toEqual([]);
  });
});

describe("quote and the server clock", () => {
  it("returns the quote with the device's offset from the server Date header", async () => {
    const serverNow = new Date(Date.now() + 10 * 60_000);
    server.use(
      http.post("/api/v1/deposits/quote", () =>
        HttpResponse.json(quote("q-1"), { headers: { Date: serverNow.toUTCString() } }),
      ),
    );
    const { result } = renderHook(() => useQuote(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ amountCents: 50000 });
    });
    const offset = result.current.data?.clockOffsetMs ?? 0;
    expect(Math.abs(offset - 10 * 60_000)).toBeLessThan(2000);
    expect(result.current.data?.quote.id).toBe("q-1");
  });
});
