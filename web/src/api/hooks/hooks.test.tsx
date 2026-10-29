import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { server } from "@/mocks/node";
import { ApiProvider } from "../ApiProvider";
import { createMockAuthClient } from "../auth";
import { AuthProvider } from "../AuthProvider";
import type { DepositDetail } from "../proposed-types";
import { useMe, useTermsDocuments } from "./account";
import { useConfig } from "./config";
import { depositPollingInterval, useCreateDeposit, useDeposits } from "./deposits";
import { usePortfolio } from "./portfolio";

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

const deposit: DepositDetail = {
  id: "dep-1",
  rail: "ar_usdc",
  state: "deposit_notified",
  amountCents: 50000,
  costs: [],
  history: [{ state: "deposit_notified", at: "2026-10-27T12:05:00Z" }],
  createdAt: "2026-10-27T12:05:00Z",
  isFirstDeposit: true,
};

const descriptions = { es: "Empresas de EE. UU.", pt: "Empresas dos EUA", en: "US companies" };

describe("query hooks", () => {
  it("useTermsDocuments returns the four documents, the IBKR consent included", async () => {
    const { result } = renderHook(() => useTermsDocuments(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toHaveLength(4);
    });
    expect(result.current.data?.map((doc) => doc.kind)).toContain("ibkr_data_consent");
  });

  it("useConfig returns the mock config", async () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.liveMarkets).toEqual(["AR"]);
    expect(result.current.data?.minRecurringUsdCents).toBe(25000);
  });

  it("useCreateDeposit sends the body and the key it was given", async () => {
    let seenKey: string | null = null;
    let seenBody: unknown;
    server.use(
      http.post("/api/v1/deposits", async ({ request }) => {
        seenKey = request.headers.get("Idempotency-Key");
        seenBody = await request.json();
        return HttpResponse.json(deposit, { status: 201 });
      }),
    );
    const { result } = renderHook(() => useCreateDeposit(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        body: { quoteId: "q-1", rail: "ar_usdc" },
        idempotencyKey: "k-123",
      }),
    );
    expect(seenKey).toBe("k-123");
    expect(seenBody).toEqual({ quoteId: "q-1", rail: "ar_usdc" });
    await waitFor(() => {
      expect(result.current.data?.id).toBe("dep-1");
    });
  });

  it("refetches editorial data in the new language", async () => {
    server.use(
      http.get("/api/v1/portfolio", ({ request }) => {
        const lang = request.headers.get("Accept-Language") as keyof typeof descriptions;
        return HttpResponse.json({
          totalCents: 0,
          buckets: { inFlightCents: 0, ibkrCashCents: 0, investedCents: 0, feesPaidCents: 0 },
          positions: [
            {
              isin: "IE00B5BMR087",
              name: "S&P 500",
              shares: 1,
              valueCents: 0,
              weight: 1,
              targetWeight: 1,
              description: descriptions[lang],
            },
          ],
          asOf: "2026-10-28T03:00:00Z",
        });
      }),
    );
    const { result } = renderHook(() => usePortfolio(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.positions[0]?.description).toBe(descriptions.es);
    });

    await act(() => i18n.changeLanguage("pt"));
    await waitFor(() => {
      expect(result.current.data?.positions[0]?.description).toBe(descriptions.pt);
    });
  });

  it("useDeposits sends the state filter and follows the cursor", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/v1/deposits", ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.search);
        const cursor = url.searchParams.get("cursor");
        return HttpResponse.json(
          cursor
            ? { items: [{ ...deposit, id: "dep-2" }] }
            : { items: [deposit], nextCursor: "c-2" },
        );
      }),
    );
    const { result } = renderHook(() => useDeposits({ state: "invested" }), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(1);
    });
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => {
      expect(result.current.data?.pages.flatMap((page) => page.items).map((d) => d.id)).toEqual([
        "dep-1",
        "dep-2",
      ]);
    });
    expect(seen).toEqual(["?state=invested", "?state=invested&cursor=c-2"]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces 401 session_expired as an ApiError code", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({ error: { code: "session_expired", message: "" } }, { status: 401 }),
      ),
    );
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => {
      expect(result.current.error).toMatchObject({ status: 401, code: "session_expired" });
    });
  });
});

describe("depositPollingInterval", () => {
  it("polls every 30 s until the deposit is invested or returned", () => {
    expect(depositPollingInterval({ ...deposit, state: "deposit_notified" })).toBe(30_000);
    expect(depositPollingInterval({ ...deposit, state: "broker_credited" })).toBe(30_000);
    expect(depositPollingInterval(undefined)).toBe(30_000);
    expect(depositPollingInterval({ ...deposit, state: "invested" })).toBe(false);
    expect(depositPollingInterval({ ...deposit, state: "returned" })).toBe(false);
  });
});
