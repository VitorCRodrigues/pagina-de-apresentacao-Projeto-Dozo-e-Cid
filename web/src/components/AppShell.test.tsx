import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("shows the symbol alone in the header; the screen title right below names the page", () => {
    render(<AppShell>x</AppShell>);
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("img", { name: "OpenDollars" })).toHaveAttribute(
      "src",
      expect.stringMatching(/symbol\.png$/),
    );
    expect(header.querySelector("img[src*='wordmark']")).toBeNull();
  });
});
