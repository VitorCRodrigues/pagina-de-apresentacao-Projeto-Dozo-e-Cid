import { describe, expect, it } from "vitest";
import { asLocale } from "./locale";

describe("asLocale", () => {
  it("maps languages and regional tags to a supported locale", () => {
    expect(asLocale("pt")).toBe("pt");
    expect(asLocale("pt-BR")).toBe("pt");
    expect(asLocale("en-US")).toBe("en");
    expect(asLocale("es-AR")).toBe("es");
  });

  it("falls back to Spanish", () => {
    expect(asLocale(undefined)).toBe("es");
    expect(asLocale("fr")).toBe("es");
  });
});
