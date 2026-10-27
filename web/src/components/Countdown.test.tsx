import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Countdown } from "./Countdown";

const start = Date.parse("2026-10-27T12:00:00Z");

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: start });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down, warns in the last minute and reports expiry once", () => {
    const onExpire = vi.fn();
    render(
      <Countdown
        expiresAt="2026-10-27T12:01:05Z"
        label="La cotización vence en"
        onExpire={onExpire}
      />,
    );

    expect(screen.getByRole("timer")).toHaveTextContent("1:05");
    expect(screen.getByRole("status")).toHaveTextContent("");

    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("0:59");
    expect(screen.getByRole("status")).toHaveTextContent("Queda menos de un minuto.");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("El plazo venció.");
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
