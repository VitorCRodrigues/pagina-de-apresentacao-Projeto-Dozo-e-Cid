import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as fixtures from "@/mocks/fixtures";
import { namespaces, supportedLocales } from "./index";

// Everything the client can read: the locale files and the editorial texts the API serves
// (mocked in fixtures.ts until the real API exists).
const root = resolve(__dirname, "..");
const files = import.meta.glob<{ default: unknown }>("./locales/*/*.json", { eager: true });

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key)),
    ),
  );
}

const bundle = (locale: string, ns: string) =>
  flatten(files[`./locales/${locale}/${ns}.json`]?.default);

const localeTexts = supportedLocales.flatMap((locale) =>
  namespaces.flatMap((ns) =>
    Object.entries(bundle(locale, ns)).map(([key, text]) => ({
      where: `${locale}/${ns}:${key}`,
      text,
    })),
  ),
);
const editorialTexts = Object.entries(flatten(fixtures)).map(([where, text]) => ({
  where: `fixtures:${where}`,
  text,
}));
const allTexts = [...localeTexts, ...editorialTexts];

const spanish = allTexts.filter(
  ({ where }) => where.startsWith("es/") || /\.es$|\.label\.es$/.test(where),
);

function offenders(pattern: RegExp, texts = allTexts) {
  return texts
    .filter(({ text }) => pattern.test(text))
    .map(({ where, text }) => `${where}: ${text}`);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

// Application code: what ships, and what could put text on a screen.
const appCode = sourceFiles(root)
  .filter((path) => /\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
  .filter((path) => !/[\\/](test|i18n[\\/]demo)[\\/]/.test(path))
  .map((path) => ({
    path: relative(root, path).replaceAll("\\", "/"),
    source: readFileSync(path, "utf8"),
  }));

describe("PRD section 10 and decisions.md, in every language", () => {
  it.each([
    ["legality in the client's country", /es legal|é legal|is legal|legal en tu país/i],
    [
      "tax or succession protection",
      /impuesto de herencia|imposto de herança|inheritance tax|protección fiscal|proteção fiscal|tax protection|sucesi[oó]n|sucessã?o|sucessóri|succession/i,
    ],
    [
      "returns, or no risk",
      /rentabilidad garantizada|rentabilidade garantida|guaranteed return|sin riesgo|sem risco|no risk|risk-free|\bganhe\b|\bganá dinero\b|\bearn returns\b/i,
    ],
    ["money held by OpenDollars", /(dinero|dinheiro|money)[^.]*(con|com|with) (a )?OpenDollars/i],
    ["never mixing money (decision 11)", /nunca mezclamos|nunca misturamos|never mix/i],
    ["fiscal promises (decision 11)", /estructura fiscal|estrutura fiscal|tax structure/i],
    ["opening in minutes (decisions 11, 17)", /\ben minutos\b|\bem minutos\b|\bin minutes\b/i],
    [
      "crypto or hype language",
      /\bcripto\b|\bcrypto\b|\bwallet\b|\bbilletera\b|\bcarteira digital\b/i,
    ],
  ])("nothing says %s", (_rule, pattern) => {
    expect(offenders(pattern)).toEqual([]);
  });

  it("names no partner without a signed contract", () => {
    expect(offenders(/Zerohash|Sumsub|Persona\b|Onfido|\beFX\b/)).toEqual([]);
  });

  it("offers the debit card and tax reports only as coming soon", () => {
    const soon =
      /tarjeta de débito|cartão de débito|debit card|reportes fiscales|relatórios fiscais|tax reports/i;
    const elsewhere = localeTexts.filter(
      ({ where, text }) => soon.test(text) && !/profile:profile\.soon\./.test(where),
    );
    expect(elsewhere).toEqual([]);
    expect(bundle("es", "profile")["profile.soon.label"]).toBe("Próximamente");
  });
});

describe("tone", () => {
  it("has no exclamation marks", () => {
    expect(offenders(/[!¡]/)).toEqual([]);
  });

  it("has no emoji", () => {
    expect(offenders(/\p{Extended_Pictographic}/u)).toEqual([]);
  });
});

describe("Argentine Spanish", () => {
  it("uses voseo, never tú", () => {
    expect(
      offenders(
        /\b(tú|ti|contigo|tienes|puedes|quieres|debes|eres|necesitas|vienes|prefieres|haz|pon|elige|escribe|sigues|recibirás|podrás|tendrás)\b/i,
        spanish,
      ),
    ).toEqual([]);
  });

  it("puts action buttons in the infinitive", () => {
    // "Ya envié" is the PRD's own wording for this button (section 6).
    const exceptions = new Set(["deposit.instructions.sent.action"]);
    const buttons = namespaces.flatMap((ns) =>
      Object.entries(bundle("es", ns))
        .filter(
          ([key]) =>
            /\.actions?\.|\.(action|save|saveChanges|confirm|submit|continue|back|retry|signIn|signOut|stay|start|send|choose|change|create|manage)$/.test(
              key,
            ) && !exceptions.has(key),
        )
        .map(([key, text]) => ({ key, text })),
    );
    expect(buttons.length).toBeGreaterThan(30);
    expect(buttons.filter(({ text }) => !/^[a-záéíóúñ]*(ar|er|ir)(me)?\b/i.test(text))).toEqual([]);
  });
});

describe("no visible text outside the locale files", () => {
  // Names of Argentine provinces are proper nouns, the same in every language.
  const allowed = new Set(["features/onboarding/countries.ts"]);

  it("has no literal text in JSX or in props that reach the screen", () => {
    const jsxText = />\s*([^<>{}\n]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n]*?)\s*</g;
    const textProp =
      /\b(aria-label|placeholder|title|alt|label|description|help|error)=["']([^"']*[A-Za-zÀ-ÿ]{2,}[^"']*)["']/g;
    const found = appCode
      .filter(({ path }) => path.endsWith(".tsx"))
      .flatMap(({ path, source }) => {
        const code = source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split("\n")
          .filter((line) => !line.trim().startsWith("//"))
          .join("\n");
        const inText = [...code.matchAll(jsxText)]
          .map((match) => (match[1] ?? "").trim())
          // Generics and arrow functions also read as ">text<".
          .filter((text) => !/=>|\bconst\b|\breturn\b|&&|[();=]|^Promise$/.test(text));
        const inProps = [...code.matchAll(textProp)].map((match) => match[2] ?? "");
        return [...inText, ...inProps].map((text) => `${path}: ${text}`);
      });
    expect(found).toEqual([]);
  });

  it("has no accented text in code, other than the provinces", () => {
    const accented = /["'`][^"'`\n]*[À-ÿ][^"'`\n]*["'`]/;
    const found = appCode
      .filter(({ path }) => !path.startsWith("mocks/") && !allowed.has(path))
      .flatMap(({ path, source }) =>
        source
          .split("\n")
          .filter((line) => !/^\s*(\/\/|\*|\{\/\*)/.test(line) && accented.test(line))
          .map((line) => `${path}: ${line.trim()}`),
      );
    expect(found).toEqual([]);
  });
});

describe("locale keys", () => {
  const used = appCode.map(({ source }) => source).join("\n");

  // A key counts as used if it appears literally, or if the code builds it from a template
  // such as `deposit.state.${state}`.
  function isUsed(key: string): boolean {
    const base = key.replace(/_(zero|one|two|few|many|other)$/, "");
    if (used.includes(base)) return true;
    const parts = base.split(".");
    return parts.some(
      (_part, index) => index > 0 && used.includes(`${parts.slice(0, index).join(".")}.\${`),
    );
  }

  it.each(namespaces)("%s has no orphan keys", (ns) => {
    expect(Object.keys(bundle("es", ns)).filter((key) => !isUsed(key))).toEqual([]);
  });

  const placeholders = (text: string) =>
    [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

  it.each(namespaces)("%s uses the same placeholders in every language", (ns) => {
    for (const [key, text] of Object.entries(bundle("es", ns))) {
      for (const locale of ["pt", "en"]) {
        expect([`${locale}/${ns}:${key}`, placeholders(bundle(locale, ns)[key] ?? "")]).toEqual([
          `${locale}/${ns}:${key}`,
          placeholders(text),
        ]);
      }
    }
  });
});
