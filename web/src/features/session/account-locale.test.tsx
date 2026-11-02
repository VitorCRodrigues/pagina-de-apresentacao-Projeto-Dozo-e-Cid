import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import i18n, { detectionOptions } from "@/i18n";
import { saveExplicitLocale } from "@/i18n/locale-preference";
import { lucia } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import { renderApp } from "@/test/render-app";

const accountIn = (locale: string) => {
  server.use(http.get("/api/v1/me", () => HttpResponse.json({ ...lucia, locale })));
};
const nav = () => screen.findByRole("navigation", {}, { timeout: 4000 });

describe("language precedence at sign-in", () => {
  it("a device without an explicit choice takes the account's language", async () => {
    accountIn("pt");
    renderApp({ path: "/inicio" });
    await nav();
    expect(await screen.findByRole("heading", { level: 1, name: "Sua conta" })).toBeInTheDocument();
    expect(window.localStorage.getItem("od.locale.choice")).toBeNull();
  });

  it("an explicit choice on the device wins over the account", async () => {
    saveExplicitLocale("es");
    accountIn("pt");
    renderApp({ path: "/inicio" });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Tu cuenta" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(i18n.resolvedLanguage).toBe("es");
  });

  it("before sign-in the browser's language applies, and detection stores nothing", () => {
    expect(detectionOptions.order).toEqual(["localStorage", "navigator"]);
    expect(detectionOptions.caches).toEqual([]);
  });
});
