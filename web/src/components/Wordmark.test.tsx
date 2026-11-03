import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("is the official flat wordmark, read as the brand name", () => {
    const { container } = render(<Wordmark />);
    const logo = screen.getByRole("img", { name: "OpenDollars" });
    expect(logo).toHaveAttribute("src", expect.stringMatching(/wordmark\.png$/));
    expect(container.querySelector("svg")).toBeNull();
  });

  it("uses the cream version on navy", () => {
    render(<Wordmark tone="inverse" />);
    expect(screen.getByRole("img", { name: "OpenDollars" })).toHaveAttribute(
      "src",
      expect.stringMatching(/wordmark-cream\.png$/),
    );
  });

  it("never uses the gradient artwork", () => {
    const { container } = render(
      <>
        <Wordmark />
        <Wordmark size="lg" tone="inverse" />
      </>,
    );
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("src")).not.toMatch(/gradient|source/);
    }
  });

  it("reserves its box before the image loads, so the header does not jump", () => {
    render(<Wordmark size="lg" />);
    const logo = screen.getByRole("img", { name: "OpenDollars" });
    expect(logo).toHaveAttribute("width");
    expect(logo).toHaveAttribute("height");
    expect(logo).toHaveClass("w-auto");
    // In the entry screen's flex column it must keep its own width, not stretch.
    expect(logo).toHaveClass("self-start");
  });
});
