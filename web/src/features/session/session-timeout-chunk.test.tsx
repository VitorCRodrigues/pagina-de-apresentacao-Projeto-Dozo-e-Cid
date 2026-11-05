import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render-app";

// The inactivity warning is a lazy chunk. If it cannot load (a deploy replaced it, the network
// dropped), the signed-in screens must stay; only the warning is missing.
vi.mock("./SessionTimeout", () => {
  throw new Error("chunk failed to load");
});

describe("a failed inactivity-warning chunk", () => {
  it("leaves the signed-in screens working", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderApp({ path: "/inicio", scenario: "open" });
    await screen.findByRole("heading", { level: 1, name: "Tu cuenta" }, { timeout: 4000 });
    // The lazy import settles after the first paint: the screen must still be there after it.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(screen.getByRole("heading", { level: 1, name: "Tu cuenta" })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error|chunk failed/)).toBeNull();
  });
});
