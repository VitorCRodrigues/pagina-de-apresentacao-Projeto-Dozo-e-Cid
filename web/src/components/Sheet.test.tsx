import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sheet } from "./Sheet";

// D13: a bottom sheet on the phone; from lg up, a dialog in the middle of the screen.
describe("Sheet", () => {
  it("rises from the bottom on a phone and sits centred on a desktop, without the handle", () => {
    render(<Sheet open title="Enviar documento" />);
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveClass("bottom-0", "rounded-t-card");
    expect(sheet).toHaveClass(
      "lg:top-1/2",
      "lg:bottom-auto",
      "lg:-translate-y-1/2",
      "lg:rounded-card",
      "lg:max-w-[440px]",
    );
    expect(sheet.querySelector("[data-sheet-handle]")).toHaveClass("lg:hidden");
  });
});
