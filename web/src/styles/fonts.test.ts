import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = (name: string) => readFileSync(resolve(__dirname, name), "utf8");
const fontsCss = css("fonts.css");
const tokensCss = css("tokens.css");
const typographyCss = css("typography.css");

// Decision of 03/11 (decisions.md): one family, Inter, in the whole product.
describe("fonts", () => {
  it("ships Inter alone, as one variable file with the optical size axis", () => {
    const files = readdirSync(resolve(__dirname, "fonts")).filter((name) =>
      name.endsWith(".woff2"),
    );
    expect(files).toEqual(["inter-latin-opsz-wght.woff2"]);
    expect([...fontsCss.matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1])).toEqual([
      "Inter Variable",
    ]);
  });

  it("has no serif anywhere in the type scale", () => {
    expect(`${fontsCss}${tokensCss}${typographyCss}`).not.toMatch(/fraunces|font-serif/i);
  });

  it("sets the headline figures in Inter Display, with lining tabular figures", () => {
    for (const name of ["type-display", "type-title", "type-value-display", "type-value-cents"]) {
      const rule = typographyCss.match(new RegExp(`@utility ${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect([name, rule]).toEqual([name, expect.stringMatching(/"opsz" 32/)]);
    }
    for (const name of ["type-value-display", "type-value-cents"]) {
      const rule = typographyCss.match(new RegExp(`@utility ${name} \\{([^}]*)\\}`))?.[1] ?? "";
      expect([name, rule]).toEqual([name, expect.stringMatching(/lining-nums tabular-nums/)]);
    }
  });
});
