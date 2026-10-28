import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createIdempotencyKey, useIdempotencyKey } from "./idempotency";

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("idempotency keys", () => {
  it("creates UUID v4 keys", () => {
    expect(createIdempotencyKey()).toMatch(uuidV4);
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey());
  });

  it("keeps the same key across re-renders and repeated clicks", () => {
    const { result, rerender } = renderHook(({ intent }) => useIdempotencyKey(intent), {
      initialProps: { intent: { quoteId: "q1", rail: "ar_usdc" } },
    });
    const first = result.current.key;
    expect(first).toMatch(uuidV4);

    // A new object with the same content is the same intent (a re-render, a second click).
    rerender({ intent: { quoteId: "q1", rail: "ar_usdc" } });
    rerender({ intent: { quoteId: "q1", rail: "ar_usdc" } });
    expect(result.current.key).toBe(first);
  });

  it("issues a new key when the intent changes", () => {
    const { result, rerender } = renderHook(({ intent }) => useIdempotencyKey(intent), {
      initialProps: { intent: { quoteId: "q1" } },
    });
    const first = result.current.key;
    rerender({ intent: { quoteId: "q2" } });
    expect(result.current.key).not.toBe(first);
  });

  it("issues a new key after reset, for the next deposit", () => {
    const { result } = renderHook(() => useIdempotencyKey({ quoteId: "q1" }));
    const first = result.current.key;
    act(() => {
      result.current.reset();
    });
    expect(result.current.key).not.toBe(first);
    expect(result.current.key).toMatch(uuidV4);
  });
});
