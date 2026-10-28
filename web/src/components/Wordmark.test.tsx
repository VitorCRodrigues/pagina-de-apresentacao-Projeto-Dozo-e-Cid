import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("reads as the brand name; the mark itself is decorative", () => {
    const { container } = render(<Wordmark />);
    expect(screen.getByText("OpenDollars")).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("switches to cream on navy instead of stacking two text colours", () => {
    const { container } = render(<Wordmark tone="inverse" />);
    const root = container.firstElementChild;
    expect(root).toHaveClass("text-cream-50");
    expect(root).not.toHaveClass("text-navy-900");
  });

  it("keeps mask ids unique when two wordmarks share a page", () => {
    const { container } = render(
      <>
        <Wordmark />
        <Wordmark size="lg" />
      </>,
    );
    const ids = [...container.querySelectorAll("mask")].map((mask) => mask.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`[mask="url(#${id})"]`)).not.toBeNull();
    }
  });
});
