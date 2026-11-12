// Builds the iOS app's texts from the web's approved copy, so both apps ship the same words.
//
// Inputs:  web/src/i18n/locales/{es,pt,en}/*.json   every key except the mock's dev.* switcher
//          ios/strings/ios-only.json                 texts only the iOS app has (also in the web's
//                                                    copy-review, for the legal review)
// Outputs: ios/OpenDollars/Resources/Localizable.xcstrings
//          ios/OpenDollars/Resources/InfoPlist.xcstrings   (permission texts)
//          ios/OpenDollars/Generated/Strings.generated.swift (typed accessors)
//
// i18next placeholders become format specifiers: {{count}} is %lld, any other is %@ (the app
// formats amounts and dates first). With several placeholders they are numbered by name order
// (%1$@, %2$@), not by position, so a reworded translation keeps each value in its argument, and
// the Swift accessor takes them as labelled arguments in that same order. i18next plurals
// (_one, _other...) become String Catalog plural variations.
//
// Deterministic: sorted keys, the JSON layout Xcode writes, no dates. Requires Node 22 or later.
// Usage (from the repository root):
//   node ios/scripts/sync-strings.mjs           write the outputs
//   node ios/scripts/sync-strings.mjs --check   fail if an output is out of date (CI)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LANGS = ["es", "pt", "en"];
const PLURAL = /^(.*)_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;
const SWIFT_RESERVED = new Set([
  "as", "break", "case", "catch", "class", "continue", "default", "defer", "do", "else", "enum",
  "extension", "fallthrough", "false", "for", "func", "guard", "if", "import", "in", "init",
  "internal", "is", "let", "nil", "operator", "private", "protocol", "public", "repeat", "return",
  "self", "static", "struct", "subscript", "super", "switch", "throw", "throws", "true", "try",
  "var", "where", "while",
]);

// --- Text conversion ---

export function placeholdersOf(text) {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();
}

const specifierOf = (name) => (name === "count" ? "lld" : "@");

/** i18next text to a format string. `names`: the key's placeholders, sorted. */
export function convert(text, names, { countAs } = {}) {
  if (names.length === 0) return text;
  const numbered = names.length > 1;
  return text.replaceAll("%", "%%").replace(PLACEHOLDER, (_, name) => {
    if (name === "count" && countAs) return countAs;
    const index = names.indexOf(name) + 1;
    return numbered ? `%${index}$${specifierOf(name)}` : `%${specifierOf(name)}`;
  });
}

export function accessorName(key) {
  const words = key.split(/[._]/).filter(Boolean);
  const name = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  if (!/^[a-z][A-Za-z0-9]*$/.test(name)) throw new Error(`${key}: no Swift name for this key`);
  return name;
}

// --- Entries ---

function flatten(value, prefix = "") {
  if (typeof value === "string") return [[prefix, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([k, child]) => flatten(child, prefix ? `${prefix}.${k}` : k));
}

/**
 * One entry per key: { key, source, forms: { lang: string | { one, other... } }, names }.
 * `web`: { lang: { namespace: tree } }. `iosOnly`: { key: { es, pt, en, screen, note } }.
 */
export function collectEntries(web, iosOnly) {
  const byKey = new Map();
  for (const lang of LANGS) {
    const seen = new Map();
    for (const ns of Object.keys(web[lang] ?? {}).sort()) {
      for (const [flatKey, text] of flatten(web[lang][ns])) {
        if (flatKey.startsWith("dev.")) continue; // the web mock's scenario switcher
        if (seen.has(flatKey)) throw new Error(`${flatKey}: in both ${seen.get(flatKey)} and ${ns}`);
        seen.set(flatKey, ns);
        const plural = flatKey.match(PLURAL);
        const key = plural ? plural[1] : flatKey;
        const entry = byKey.get(key) ?? { key, source: `web: ${ns}.json`, forms: {} };
        if (plural) {
          if (typeof entry.forms[lang] === "string") throw new Error(`${key}: both plural and plain in ${lang}`);
          entry.forms[lang] = { ...entry.forms[lang], [plural[2]]: text };
        } else {
          if (entry.forms[lang] !== undefined) throw new Error(`${key}: both plural and plain in ${lang}`);
          entry.forms[lang] = text;
        }
        byKey.set(key, entry);
      }
    }
  }
  for (const [key, texts] of Object.entries(iosOnly)) {
    if (byKey.has(key)) throw new Error(`${key}: iOS-only key already exists in the web copy`);
    byKey.set(key, { key, source: "iOS only: ios/strings/ios-only.json", forms: Object.fromEntries(LANGS.map((l) => [l, texts[l]])) });
  }

  const entries = [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const entry of entries) {
    const perLang = LANGS.map((lang) => {
      const form = entry.forms[lang];
      if (form === undefined) throw new Error(`${entry.key}: missing in ${lang}`);
      const texts = typeof form === "string" ? [form] : Object.values(form);
      if (typeof form !== "string" && form.other === undefined) throw new Error(`${entry.key}: plural without "other" in ${lang}`);
      return placeholdersOf(texts.join(" "));
    });
    if (new Set(perLang.map((names) => names.join(","))).size > 1) {
      throw new Error(`${entry.key}: placeholders differ between languages (${perLang.map((n, i) => `${LANGS[i]}: ${n.join(",")}`).join("; ")})`);
    }
    entry.names = perLang[0];
    entry.plural = typeof entry.forms.es !== "string";
    if (entry.plural && !entry.names.includes("count")) throw new Error(`${entry.key}: a plural needs {{count}}`);
  }
  return entries;
}

// --- String Catalog ---

const unit = (value) => ({ stringUnit: { state: "translated", value } });

function localization(entry, lang) {
  const form = entry.forms[lang];
  if (!entry.plural) return unit(convert(form, entry.names));
  const categories = Object.keys(form).sort();
  if (entry.names.length === 1) {
    return { variations: { plural: Object.fromEntries(categories.map((c) => [c, unit(convert(form[c], entry.names))])) } };
  }
  // The count picks the variation; the other placeholders stay numbered inside each one.
  const argNum = entry.names.indexOf("count") + 1;
  return {
    stringUnit: { state: "translated", value: `%${argNum}$#@count@` },
    substitutions: {
      count: {
        argNum,
        formatSpecifier: "lld",
        variations: {
          plural: Object.fromEntries(categories.map((c) => [c, unit(convert(form[c], entry.names, { countAs: "%arg" }))])),
        },
      },
    },
  };
}

export function buildCatalog(entries) {
  return {
    sourceLanguage: "es",
    strings: Object.fromEntries(
      entries.map((entry) => [
        entry.key,
        {
          comment: entry.source,
          extractionState: "manual",
          localizations: Object.fromEntries(LANGS.map((lang) => [lang, localization(entry, lang)])),
        },
      ]),
    ),
    version: "1.0",
  };
}

export function buildInfoPlistCatalog(infoPlist) {
  return buildCatalog(
    Object.keys(infoPlist)
      .sort()
      .map((key) => ({
        key,
        source: "iOS only: ios/strings/ios-only.json (Info.plist)",
        forms: Object.fromEntries(LANGS.map((l) => [l, infoPlist[key][l]])),
        names: [],
        plural: false,
      })),
  );
}

/** The layout Xcode writes: two-space indent, `"key" : value`, keys sorted, a final newline. */
export function serialize(value) {
  const write = (v, pad) => {
    if (Array.isArray(v)) return v.length === 0 ? "[]" : `[\n${v.map((x) => `${pad}  ${write(x, `${pad}  `)}`).join(",\n")}\n${pad}]`;
    if (v !== null && typeof v === "object") {
      const keys = Object.keys(v).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (keys.length === 0) return "{\n\n}";
      return `{\n${keys.map((k) => `${pad}  ${JSON.stringify(k)} : ${write(v[k], `${pad}  `)}`).join(",\n")}\n${pad}}`;
    }
    return JSON.stringify(v);
  };
  return `${write(value, "")}\n`;
}

// --- Swift accessors ---

const label = (name) => (SWIFT_RESERVED.has(name) ? `\`${name}\`` : name);

export function swiftAccessors(entries) {
  const used = new Map();
  const members = entries.map((entry) => {
    const name = accessorName(entry.key);
    if (used.has(name)) throw new Error(`${entry.key} and ${used.get(name)} both become Strings.${name}`);
    used.set(name, entry.key);
    const es = typeof entry.forms.es === "string" ? entry.forms.es : entry.forms.es.other;
    const doc = `    /// ${es.replace(/\s+/g, " ").trim()}`;
    if (entry.names.length === 0) {
      return `${doc}\n    static var ${name}: String { L10n.text(${JSON.stringify(entry.key)}) }`;
    }
    const params = entry.names.map((n) => `${label(n)}: ${n === "count" ? "Int" : "String"}`).join(", ");
    const args = entry.names.map(label).join(", ");
    return `${doc}\n    static func ${name}(${params}) -> String { L10n.format(${JSON.stringify(entry.key)}, ${args}) }`;
  });
  return `// Generated by ios/scripts/sync-strings.mjs from the web's locale files and
// ios/strings/ios-only.json. Do not edit: change the copy there and run the script again.
// swiftlint:disable all

/// Every text of the app, by its web key, in the language L10n is set to.
enum Strings {
${members.join("\n\n")}
}
`;
}

// --- Files ---

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const paths = {
  locales: join(root, "web/src/i18n/locales"),
  iosOnly: join(root, "ios/strings/ios-only.json"),
  localizable: join(root, "ios/OpenDollars/Resources/Localizable.xcstrings"),
  infoPlist: join(root, "ios/OpenDollars/Resources/InfoPlist.xcstrings"),
  swift: join(root, "ios/OpenDollars/Generated/Strings.generated.swift"),
};

export function readInputs() {
  const web = Object.fromEntries(
    LANGS.map((lang) => [
      lang,
      Object.fromEntries(
        readdirSync(join(paths.locales, lang))
          .filter((f) => f.endsWith(".json"))
          .sort()
          .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(paths.locales, lang, f), "utf8"))]),
      ),
    ]),
  );
  const iosOnly = JSON.parse(readFileSync(paths.iosOnly, "utf8"));
  return { web, iosOnly };
}

export function outputs({ web, iosOnly }) {
  const entries = collectEntries(web, iosOnly.strings);
  return {
    entries,
    files: {
      [paths.localizable]: serialize(buildCatalog(entries)),
      [paths.infoPlist]: serialize(buildInfoPlistCatalog(iosOnly.infoPlist)),
      [paths.swift]: swiftAccessors(entries),
    },
  };
}

/** Same text, whatever the line ends: git's core.autocrlf checks files out with CRLF on Windows. */
export function sameText(onDisk, generated) {
  return onDisk.replaceAll("\r\n", "\n") === generated;
}

function main() {
  const check = process.argv.includes("--check");
  const { entries, files } = outputs(readInputs());
  const stale = Object.entries(files).filter(([path, text]) => !existsSync(path) || !sameText(readFileSync(path, "utf8"), text));
  const shown = (path) => relative(root, path).replaceAll("\\", "/");
  if (check) {
    if (stale.length > 0) {
      console.error(`Out of date: ${stale.map(([p]) => shown(p)).join(", ")}. Run: node ios/scripts/sync-strings.mjs`);
      process.exit(1);
    }
    console.log(`sync-strings: up to date (${entries.length} keys)`);
    return;
  }
  for (const [path, text] of stale) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text); // exactly these bytes: LF line ends on every platform
  }
  console.log(`sync-strings: ${entries.length} keys; wrote ${stale.length === 0 ? "nothing (up to date)" : stale.map(([p]) => shown(p)).join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
