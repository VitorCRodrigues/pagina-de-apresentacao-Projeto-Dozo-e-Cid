import { describe, expect, it } from "vitest";
import { demoResources } from "./demo";
import { resources, supportedLocales } from "./index";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  if (Array.isArray(value)) return [`${prefix}[${String(value.length)}]`];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale files", () => {
  const reference = flattenKeys(resources.es.translation).sort();
  const demoReference = flattenKeys(demoResources.es).sort();

  it.each(supportedLocales)("%s has exactly the same keys as es", (locale) => {
    expect(flattenKeys(resources[locale].translation).sort()).toEqual(reference);
  });

  it.each(supportedLocales)("demo %s has exactly the same keys as demo es", (locale) => {
    expect(flattenKeys(demoResources[locale]).sort()).toEqual(demoReference);
  });
});
