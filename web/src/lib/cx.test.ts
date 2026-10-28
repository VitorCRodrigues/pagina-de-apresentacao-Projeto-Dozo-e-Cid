import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("drops falsy values", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });

  it("lets a later colour replace an earlier one (the Wordmark bug)", () => {
    expect(cx("text-navy-900", "text-cream-50")).toBe("text-cream-50");
    expect(cx("bg-gray-100", "bg-navy-50")).toBe("bg-navy-50");
    expect(cx("border border-gray-200", "border-brick-700")).toBe("border border-brick-700");
  });

  it("keeps a font size and a colour together", () => {
    expect(cx("text-lg", "text-navy-900")).toBe("text-lg text-navy-900");
  });

  it("knows the project's own radius, shadow, motion and type tokens", () => {
    expect(cx("rounded-control", "rounded-card")).toBe("rounded-card");
    expect(cx("shadow-hairline", "shadow-overlay")).toBe("shadow-overlay");
    expect(cx("duration-fast", "duration-base")).toBe("duration-base");
    expect(cx("type-body", "type-label")).toBe("type-label");
    expect(cx("type-label", "text-navy-900")).toBe("type-label text-navy-900");
  });
});
