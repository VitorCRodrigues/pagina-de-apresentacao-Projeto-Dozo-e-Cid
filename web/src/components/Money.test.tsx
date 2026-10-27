import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "./Money";

describe("Money", () => {
  it("renders inline amounts formatted by locale", () => {
    render(<Money cents={123456} locale="en" />);
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("gives the display size one readable string for screen readers", () => {
    const { container } = render(<Money cents={1248050} locale="es" size="display" />);
    expect(container.querySelector(".sr-only")).toHaveTextContent("US$ 12.480,50");
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("US$12.480,50");
  });

  it("refuses fractional cents", () => {
    expect(() => render(<Money cents={10.5} locale="es" />)).toThrow(TypeError);
  });
});
