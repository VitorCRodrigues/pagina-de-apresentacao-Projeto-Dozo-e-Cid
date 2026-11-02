import { describe, expect, it } from "vitest";
import { prefsPatch } from "./notification-prefs";

describe("prefsPatch", () => {
  const current = { email: true, push: false };

  it("sends only the field that changed", () => {
    expect(prefsPatch(current, "push", true)).toEqual({ push: true });
    expect(prefsPatch(current, "email", false)).toEqual({ email: false });
  });

  it("sends nothing when the value is already saved", () => {
    expect(prefsPatch(current, "email", true)).toBeNull();
    expect(prefsPatch(current, "push", false)).toBeNull();
  });
});
