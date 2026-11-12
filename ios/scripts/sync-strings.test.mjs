// Tests for sync-strings.mjs. Run with: node --test ios/scripts/
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessorName,
  buildCatalog,
  collectEntries,
  convert,
  placeholdersOf,
  sameText,
  serialize,
  swiftAccessors,
} from "./sync-strings.mjs";

const unit = (value) => ({ stringUnit: { state: "translated", value } });

describe("placeholders", () => {
  it("reads i18next placeholders by name, sorted", () => {
    assert.deepEqual(placeholdersOf("{{percent}} y {{cost}} en {{days}}"), ["cost", "days", "percent"]);
  });

  it("turns a single placeholder into a plain specifier: count is a number, the rest strings", () => {
    assert.equal(convert("Actualizado el {{date}}", ["date"]), "Actualizado el %@");
    assert.equal(convert("Tenés {{count}} pendientes.", ["count"]), "Tenés %lld pendientes.");
  });

  it("numbers several placeholders by name order, not by position in the text", () => {
    const names = ["cost", "days", "percent"];
    assert.equal(convert("{{cost}} ({{percent}}), {{days}} días", names), "%1$@ (%3$@), %2$@ días");
    // A reworded translation keeps each value in its argument.
    assert.equal(convert("{{days}} dias, {{cost}} ({{percent}})", names), "%2$@ dias, %1$@ (%3$@)");
  });

  it("escapes a literal percent sign only in format strings", () => {
    assert.equal(convert("Comisión de {{cost}} (0,30%).", ["cost"]), "Comisión de %@ (0,30%%).");
    // A text without placeholders is never formatted, so its % stays single.
    assert.equal(convert("Comisión de 0,30%.", []), "Comisión de 0,30%.");
  });
});

describe("accessor names", () => {
  it("camel-cases the key", () => {
    assert.equal(accessorName("account.title.ibkr_pending"), "accountTitleIbkrPending");
    assert.equal(accessorName("home.updatedAt"), "homeUpdatedAt");
    assert.equal(accessorName("dev.catalog.title"), "devCatalogTitle");
  });
});

const web = {
  es: {
    translation: { common: { retry: "Reintentar" }, dev: { scenario: "Escenario" } },
    portfolio: {
      home: { updatedAt: "Actualizado el {{date}}", pending_one: "Tenés {{count}} pendiente.", pending_other: "Tenés {{count}} pendientes." },
      rail: { days_one: "{{min}} a {{count}} día hábil", days_other: "{{min}} a {{count}} días hábiles" },
    },
  },
  pt: {
    translation: { common: { retry: "Tentar de novo" }, dev: { scenario: "Cenário" } },
    portfolio: {
      home: { updatedAt: "Atualizado em {{date}}", pending_one: "Você tem {{count}} pendência.", pending_other: "Você tem {{count}} pendências." },
      rail: { days_one: "{{min}} a {{count}} dia útil", days_other: "{{min}} a {{count}} dias úteis" },
    },
  },
  en: {
    translation: { common: { retry: "Try again" }, dev: { scenario: "Scenario" } },
    portfolio: {
      home: { updatedAt: "Updated on {{date}}", pending_one: "You have {{count}} pending item.", pending_other: "You have {{count}} pending items." },
      rail: { days_one: "{{min}} to {{count}} business day", days_other: "{{min}} to {{count}} business days" },
    },
  },
};
const iosOnly = {
  strings: {
    "dev.catalog.title": { es: "Catálogo", pt: "Catálogo", en: "Catalog", screen: "dev", note: "" },
  },
  infoPlist: {
    NSCameraUsageDescription: { es: "Cámara", pt: "Câmera", en: "Camera", screen: "Permissão", note: "" },
  },
};

describe("entries", () => {
  const entries = collectEntries(web, iosOnly.strings);

  it("takes every web key except the mock's dev switcher, plus the iOS-only keys", () => {
    assert.deepEqual(
      entries.map((e) => e.key).sort(),
      ["common.retry", "dev.catalog.title", "home.pending", "home.updatedAt", "rail.days"],
    );
  });

  it("refuses a key whose placeholders differ between languages", () => {
    const broken = structuredClone(web);
    broken.pt.portfolio.home.updatedAt = "Atualizado";
    assert.throws(() => collectEntries(broken, {}), /home\.updatedAt.*placeholders/);
  });

  it("refuses a key missing in a language", () => {
    const broken = structuredClone(web);
    delete broken.en.translation.common.retry;
    assert.throws(() => collectEntries(broken, {}), /common\.retry.*en/);
  });

  it("refuses an iOS-only key that the web already has", () => {
    assert.throws(
      () => collectEntries(web, { "common.retry": { es: "x", pt: "x", en: "x" } }),
      /common\.retry/,
    );
  });
});

describe("catalog", () => {
  const catalog = buildCatalog(collectEntries(web, iosOnly.strings));

  it("writes a plural with only a count as plural variations", () => {
    assert.deepEqual(catalog.strings["home.pending"].localizations.es, {
      variations: {
        plural: { one: unit("Tenés %lld pendiente."), other: unit("Tenés %lld pendientes.") },
      },
    });
  });

  it("writes a plural with other placeholders as a substitution on the count", () => {
    const es = catalog.strings["rail.days"].localizations.es;
    assert.deepEqual(es.stringUnit, { state: "translated", value: "%1$#@count@" });
    assert.equal(es.substitutions.count.argNum, 1);
    assert.equal(es.substitutions.count.formatSpecifier, "lld");
    assert.deepEqual(es.substitutions.count.variations.plural.other, unit("%2$@ a %arg días hábiles"));
  });

  it("counts a CRLF checkout of the same output as up to date", () => {
    const text = serialize(catalog);
    assert.ok(sameText(text.replaceAll("\n", "\r\n"), text));
    assert.ok(!sameText(text.replace("es", "pt"), text));
  });

  it("is deterministic and formatted the way Xcode writes it", () => {
    const again = buildCatalog(collectEntries(web, iosOnly.strings));
    assert.equal(serialize(catalog), serialize(again));
    assert.match(serialize(catalog), /^\{\n {2}"sourceLanguage" : "es",\n/);
    assert.ok(serialize(catalog).endsWith("}\n"));
  });
});

describe("Swift accessors", () => {
  const swift = swiftAccessors(collectEntries(web, iosOnly.strings));

  it("gives a text without placeholders as a property", () => {
    assert.match(swift, /static var commonRetry: String \{ L10n\.text\("common\.retry"\) \}/);
  });

  it("gives placeholders as labelled arguments in name order, count as Int", () => {
    assert.match(swift, /static func homeUpdatedAt\(date: String\) -> String \{ L10n\.format\("home\.updatedAt", date\) \}/);
    assert.match(swift, /static func railDays\(count: Int, min: String\) -> String \{ L10n\.format\("rail\.days", count, min\) \}/);
  });

  it("documents each accessor with its Spanish text", () => {
    assert.match(swift, /\/\/\/ Actualizado el \{\{date\}\}\n/);
  });
});
