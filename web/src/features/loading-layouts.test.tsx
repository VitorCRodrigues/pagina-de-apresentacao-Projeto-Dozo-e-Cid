import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

// D12: each screen loads into a placeholder shaped like it, not a generic block. The "slow"
// scenario holds every answer for 3 s, so the first paint is the placeholder.
describe.each([
  ["/inicio", "balance"],
  ["/cartera", "balance"],
  ["/aportar/nuevo", "form"],
  ["/aportar/dep-scenario", "timeline"],
  ["/plan", "statement"],
  ["/pendientes", "statement"],
  ["/perfil/ayuda", "statement"],
])("%s", (path, shape) => {
  it(`loads into a ${shape} placeholder`, async () => {
    renderApp({ path, scenario: "slow", signedIn: true });
    await screen.findAllByRole("status", {}, { timeout: 6000 });
    // The session (GET /me, /config) loads first, behind the shell's own placeholder.
    await expect
      .poll(() => document.querySelector(`[data-skeleton="${shape}"]`), { timeout: 8000 })
      .not.toBeNull();
  }, 15_000);
});
