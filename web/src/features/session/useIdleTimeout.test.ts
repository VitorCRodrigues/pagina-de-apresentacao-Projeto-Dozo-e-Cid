import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS, useIdleTimeout } from "./useIdleTimeout";

const start = Date.parse("2026-10-28T12:00:00Z");

function setup() {
  const onTimeout = vi.fn();
  const hook = renderHook(() =>
    useIdleTimeout({ timeoutMs: SESSION_TIMEOUT_MS, warningMs: SESSION_WARNING_MS, onTimeout }),
  );
  return { ...hook, onTimeout };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: start });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses 15 minutes with a 60-second warning", () => {
    expect(SESSION_TIMEOUT_MS).toBe(15 * 60 * 1000);
    expect(SESSION_WARNING_MS).toBe(60 * 1000);
  });

  it("warns 60 s before the limit and times out at 15 minutes", () => {
    const { result, onTimeout } = setup();

    advance(14 * 60_000 - 1000);
    expect(result.current.deadline).toBeNull();

    advance(1000);
    expect(result.current.deadline).toBe(start + 15 * 60_000);
    expect(onTimeout).not.toHaveBeenCalled();

    advance(60_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    advance(60_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("restarts the count on activity before the warning", () => {
    const { result } = setup();

    advance(10 * 60_000);
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    advance(10 * 60_000);
    expect(result.current.deadline).toBeNull();
  });

  it("ignores ambient activity once warned; only stayActive keeps the session", () => {
    const { result, onTimeout } = setup();

    advance(14 * 60_000);
    expect(result.current.deadline).not.toBeNull();

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.deadline).not.toBeNull();

    act(() => {
      result.current.stayActive();
    });
    expect(result.current.deadline).toBeNull();

    advance(14 * 60_000 - 1000);
    expect(result.current.deadline).toBeNull();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
