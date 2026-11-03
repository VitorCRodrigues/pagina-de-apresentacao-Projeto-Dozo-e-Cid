import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandSymbol } from "./BrandSymbol";

describe("BrandSymbol", () => {
  it("is the flat navy symbol, read as the brand name", () => {
    render(<BrandSymbol />);
    const logo = screen.getByRole("img", { name: "OpenDollars" });
    expect(logo).toHaveAttribute("src", expect.stringMatching(/symbol\.png$/));
  });

  it("uses the cream version on navy", () => {
    render(<BrandSymbol tone="inverse" />);
    expect(screen.getByRole("img", { name: "OpenDollars" })).toHaveAttribute(
      "src",
      expect.stringMatching(/symbol-cream\.png$/),
    );
  });

  it("reserves its box with the file's own proportions", () => {
    render(<BrandSymbol />);
    const logo = screen.getByRole("img", { name: "OpenDollars" });
    expect(logo).toHaveAttribute("width", "150");
    expect(logo).toHaveAttribute("height", "120");
    expect(logo).toHaveClass("h-8", "w-auto");
  });
});
