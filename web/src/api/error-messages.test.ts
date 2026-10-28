import { describe, expect, it } from "vitest";
import i18n, { supportedLocales } from "@/i18n";
import { blockMessageKeys, errorMessageKey } from "./error-messages";
import { ApiError, type ClientErrorCode } from "./errors";
import { apiErrorCodes } from "./proposed-types";
import { blockReasons } from "./schemas";

const clientCodes: ClientErrorCode[] = [...apiErrorCodes, "network", "invalid_response"];

describe("error and block messages", () => {
  it.each(clientCodes)("%s has a message in es, pt and en", (code) => {
    for (const lng of supportedLocales) {
      expect(i18n.exists(`errors.${code}`, { lng }), `${lng}: errors.${code}`).toBe(true);
    }
  });

  it.each(blockReasons)("%s has a message and an action in es, pt and en", (reason) => {
    const { message, action } = blockMessageKeys(reason);
    for (const lng of supportedLocales) {
      expect(i18n.exists(message, { lng }), `${lng}: ${message}`).toBe(true);
      expect(i18n.exists(action, { lng }), `${lng}: ${action}`).toBe(true);
    }
  });

  it("maps an ApiError to its code and anything else to internal", () => {
    expect(errorMessageKey(new ApiError({ status: 409, code: "quote_expired", message: "" }))).toBe(
      "errors.quote_expired",
    );
    expect(errorMessageKey(new Error("x"))).toBe("errors.internal");
    expect(errorMessageKey("boom")).toBe("errors.internal");
  });

  it("never reveals the compliance reason to the client", () => {
    const { message } = blockMessageKeys("compliance_hold");
    expect(i18n.t(message, { lng: "es" })).not.toMatch(/sanci|compliance|revisi/i);
  });
});
