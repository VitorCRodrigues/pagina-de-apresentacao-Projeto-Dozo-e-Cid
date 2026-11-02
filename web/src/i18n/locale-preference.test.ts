import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCALE_KEY,
  preferredLocale,
  readExplicitLocale,
  saveExplicitLocale,
} from "./locale-preference";

describe("preferredLocale", () => {
  it("an explicit choice on this device wins over the account and the browser", () => {
    expect(preferredLocale({ explicit: "en", account: "pt", browser: "es" })).toBe("en");
  });

  it("without an explicit choice, the account's language wins over the browser", () => {
    expect(preferredLocale({ explicit: null, account: "pt", browser: "es" })).toBe("pt");
  });

  it("without either, the browser's language stays", () => {
    expect(preferredLocale({ explicit: null, account: undefined, browser: "es" })).toBe("es");
  });
});

describe("the explicit choice on this device", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is absent until the client chooses", () => {
    expect(readExplicitLocale()).toBeNull();
    saveExplicitLocale("pt");
    expect(readExplicitLocale()).toBe("pt");
  });

  it("can be cleared, to undo a choice the account refused", () => {
    saveExplicitLocale("pt");
    saveExplicitLocale(null);
    expect(readExplicitLocale()).toBeNull();
  });

  it("ignores an unknown stored value", () => {
    window.localStorage.setItem(LOCALE_KEY, "fr");
    expect(readExplicitLocale()).toBeNull();
  });

  it("does not take what the old detector cached for a choice", () => {
    window.localStorage.setItem("od.locale", "es");
    expect(readExplicitLocale()).toBeNull();
  });

  it("survives a blocked localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readExplicitLocale()).toBeNull();
    expect(() => {
      saveExplicitLocale("pt");
    }).not.toThrow();
  });
});
