import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "./zod";

// The production CSP forbids eval (vite.config.ts). Zod probes `new Function` before its first
// parse to decide on JIT; the throw is caught, but the browser still reports a CSP violation.
describe("zod under the CSP", () => {
  it("runs without its eval probe (jitless)", () => {
    expect(z.config().jitless).toBe(true);
  });

  it("is imported only through @/lib/zod, so the setting always applies", () => {
    const root = resolve(__dirname, "..");
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : [path];
      });
    const direct = files(root)
      // Application code: tests never run under the CSP.
      .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
      .filter((path) => !path.endsWith(join("lib", "zod.ts")))
      .filter((path) => /from "zod"/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path).replaceAll("\\", "/"));
    expect(direct).toEqual([]);
  });
});
