import { describe, expect, it } from "vitest";
import { contrastPairs, contrastRatio, parseColorTokens } from "./contrast";
import tokensCss from "./tokens.css?raw";

const tokens = parseColorTokens(tokensCss);

function hex(name: string): string {
  const value = tokens.get(name);
  if (!value) throw new Error(`Token --od-${name} not found in tokens.css`);
  return value;
}

describe("colour tokens", () => {
  it.each(contrastPairs)("$fg on $bg meets $min:1 ($use)", ({ fg, bg, min }) => {
    expect(contrastRatio(hex(fg), hex(bg))).toBeGreaterThanOrEqual(min);
  });

  it("gold is never readable as text on cream", () => {
    expect(contrastRatio(hex("gold-500"), hex("cream-50"))).toBeLessThan(3);
  });
});
