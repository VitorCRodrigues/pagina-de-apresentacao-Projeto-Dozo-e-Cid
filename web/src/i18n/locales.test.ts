import { describe, expect, it } from "vitest";
import { resources, supportedLocales } from "./index";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale files", () => {
  const reference = flattenKeys(resources.es.translation).sort();

  it.each(supportedLocales)("%s has exactly the same keys as es", (locale) => {
    expect(flattenKeys(resources[locale].translation).sort()).toEqual(reference);
  });
});
