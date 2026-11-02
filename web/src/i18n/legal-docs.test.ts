import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { namespaces } from "./index";

const web = resolve(__dirname, "../..");
const doc = (name: string) => readFileSync(join(web, "docs", name), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

const files = import.meta.glob<{ default: unknown }>("./locales/es/*.json", { eager: true });

describe("documents for the legal review", () => {
  it("copy-review lists every text the client can read", () => {
    const csv = doc("copy-review.csv");
    const md = doc("copy-review.md");
    for (const ns of namespaces) {
      for (const key of keysOf(files[`./locales/es/${ns}.json`]?.default)) {
        if (key.startsWith("dev.")) continue;
        expect(csv).toContain(`"${key}"`);
        expect(md).toContain(`\`${key}\``);
      }
    }
  });

  it("copy-review starts with the RIA items, each one marked", () => {
    const [header, first] = doc("copy-review.csv").split("\r\n");
    expect(header).toContain("Status jurídico");
    expect(first).toContain("depende da confirmação do registro RIA antes do piloto");
  });

  it("open-items covers every file with a TODO", () => {
    const open = doc("open-items.md");
    const withTodo = sourceFiles(join(web, "src"))
      .filter((path) => /\.tsx?$/.test(path) && !/copy-rules|legal-docs/.test(path))
      .filter((path) => /TODO\((compliance|decisão)\)/.test(readFileSync(path, "utf8")))
      .map((path) => relative(web, path).replaceAll("\\", "/"));
    expect(withTodo.length).toBeGreaterThan(20);
    expect(withTodo.filter((path) => !open.includes(`\`${path}\``))).toEqual([]);
  });
});
