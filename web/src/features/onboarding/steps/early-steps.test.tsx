import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

// Records the bodies sent to a route, still answering with the given status.
function record(method: "put" | "post", path: string, status = 204) {
  const bodies: unknown[] = [];
  server.use(
    http[method](`/api/v1${path}`, async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status });
    }),
  );
  return bodies;
}

describe("onboarding steps 1 to 3", () => {
  it("a country outside the pilot ends with the waitlist for that country", async () => {
    const posted = record("post", "/waitlist");
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/residencia", scenario: "draft" });

    await user.click(
      await screen.findByRole("combobox", { name: "País de residencia" }, { timeout: 4000 }),
    );
    await user.click(await screen.findByRole("option", { name: "Uruguay" }));

    expect(
      await screen.findByRole("heading", { name: "Todavía no abrimos cuentas en Uruguay" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Anotarme en la lista" }));
    await waitFor(() => {
      expect(posted).toEqual([{ email: "lucia.fernandez@example.com", country: "UY" }]);
    });
  });

  it("says where the account is opened and who advises", async () => {
    renderApp({ path: "/onboarding/residencia", scenario: "draft" });
    expect(
      await screen.findByText(
        "Tu cuenta se abre en Interactive Brokers, a tu nombre. OpenDollars es tu asesora de inversiones.",
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  });

  it("an invalid CUIL shows the translated error and saves nothing", async () => {
    const saved = record("put", "/onboarding/personal");
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/datos", scenario: "draft" });

    const cuil = await screen.findByLabelText("CUIL o CUIT", {}, { timeout: 4000 });
    await user.clear(cuil);
    await user.type(cuil, "27301234560");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      await screen.findByText("Este CUIL no es válido. Revisá los números."),
    ).toBeInTheDocument();
    expect(cuil).toHaveAttribute("aria-invalid", "true");
    expect(saved).toEqual([]);
  });

  it("formats a complete CUIL when the field loses focus", async () => {
    const user = userEvent.setup();
    renderApp({ path: "/onboarding/datos", scenario: "draft" });
    const cuil = await screen.findByLabelText("CUIL o CUIT", {}, { timeout: 4000 });
    await user.click(cuil);
    await user.tab();
    expect(cuil).toHaveValue("27-30123456-8");
  });

  it("T1 waitlist still joins with the client's own country", async () => {
    const posted = record("post", "/waitlist");
    const user = userEvent.setup();
    renderApp({ path: "/inicio", scenario: "market_not_live" });
    await user.click(
      await screen.findByRole("button", { name: "Anotarme en la lista" }, { timeout: 4000 }),
    );
    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    expect(posted[0]).toMatchObject({ country: "BR" });
  });
});
