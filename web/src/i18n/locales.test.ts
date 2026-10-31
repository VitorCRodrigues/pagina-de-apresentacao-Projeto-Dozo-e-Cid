import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { demoResources } from "./demo";
import { initOptions, lazyBackend, namespaces, supportedLocales } from "./index";
import { loadNamespace } from "./load-namespace";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  if (Array.isArray(value)) return [`${prefix}[${String(value.length)}]`];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const files = import.meta.glob<{ default: unknown }>("./locales/*/*.json", { eager: true });
const bundle = (locale: string, ns: string) => files[`./locales/${locale}/${ns}.json`]?.default;

describe("locale files", () => {
  it.each(supportedLocales.flatMap((locale) => namespaces.map((ns) => [locale, ns] as const)))(
    "%s/%s exists and has exactly the keys of es",
    (locale, ns) => {
      expect(bundle(locale, ns)).toBeDefined();
      expect(flattenKeys(bundle(locale, ns)).sort()).toEqual(flattenKeys(bundle("es", ns)).sort());
    },
  );

  it.each(supportedLocales)("demo %s has exactly the same keys as demo es", (locale) => {
    expect(flattenKeys(demoResources[locale]).sort()).toEqual(flattenKeys(demoResources.es).sort());
  });
});

describe("loading on demand", () => {
  it("bundles only the Spanish common texts; everything else is a dynamic import", () => {
    const source = readFileSync(resolve(__dirname, "index.ts"), "utf8");
    const staticImports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((m) => m[1]);
    expect(staticImports.filter((path) => path?.includes("locales/"))).toEqual([
      "./locales/es/translation.json",
    ]);
  });

  async function freshInstance() {
    const instance = i18next.createInstance();
    await instance.use(lazyBackend).init({ ...initOptions(), lng: "es" });
    return instance;
  }

  it("loads Portuguese only when it is chosen", async () => {
    const instance = await freshInstance();
    expect(instance.hasResourceBundle("pt", "translation")).toBe(false);
    await instance.changeLanguage("pt");
    expect(instance.t("common.retry")).toBe("Tentar de novo");
  });

  it("loads an area's texts on demand, in the current language", async () => {
    const instance = await freshInstance();
    expect(instance.hasResourceBundle("es", "deposit")).toBe(false);
    await loadNamespace("deposit", instance);
    expect(instance.hasResourceBundle("es", "deposit")).toBe(true);
  });
});
