// Lighthouse, mobile, slow 3G, on the main routes (PRD section 9). Run with: npm run perf
// (builds dist/ and dist-measure/ first). T1 is measured on the production build; the signed-in
// routes on the measure build (in-page mock, session already open), never on dist/.
// Writes docs/performance.md and the full reports to lighthouse-reports/.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

// Chrome DevTools' "Slow 3G": 400 ms round trip, 400 kbps down. CPU 4x slower, as Lighthouse
// mobile does.
const slow3g = {
  rttMs: 400,
  throughputKbps: 400,
  requestLatencyMs: 400 * 3.75,
  downloadThroughputKbps: 400 * 0.9,
  uploadThroughputKbps: 400 * 0.9,
  cpuSlowdownMultiplier: 4,
};

// Lighthouse's own mobile default ("Slow 4G": 150 ms, 1.6 Mbps), measured too for context.
const slow4g = { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 };

const targets = [
  { name: "T1 Entrada", port: 4173, path: "/" },
  { name: "T4 Início", port: 4174, path: "/inicio" },
  { name: "T9 Carteira", port: 4174, path: "/cartera" },
  { name: "T6 Aportar", port: 4174, path: "/aportar" },
  { name: "T6 Novo aporte", port: 4174, path: "/aportar/nuevo" },
  { name: "T5 Plano", port: 4174, path: "/plan" },
  { name: "T11 Pendências", port: 4174, path: "/pendientes" },
  { name: "T12 Perfil", port: 4174, path: "/perfil" },
  { name: "T3 Status da conta", port: 4174, path: "/cuenta?scenario=action_required" },
];

const serve = (dir, port) =>
  spawn(process.execPath, ["scripts/serve-static.mjs", dir, String(port), "--spa"], {
    stdio: "ignore",
  });

const servers = [serve("dist", 4173), serve("dist-measure", 4174)];
await new Promise((resolve) => setTimeout(resolve, 800));

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

mkdirSync("lighthouse-reports", { recursive: true });
const rows = [];
try {
  for (const target of targets) {
    const url = `http://127.0.0.1:${String(target.port)}${target.path}`;
    const fast = await lighthouse(url, {
      port: chrome.port,
      logLevel: "error",
      onlyCategories: ["performance"],
      formFactor: "mobile",
      throttlingMethod: "simulate",
      throttling: slow4g,
      screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 3 },
    });
    const slow4gScore = Math.round((fast?.lhr.categories.performance?.score ?? 0) * 100);
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      throttlingMethod: "simulate",
      throttling: slow3g,
      screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 3 },
      locale: "es",
    });
    if (!result) throw new Error(`No result for ${url}`);
    const { categories, audits } = result.lhr;
    const score = (id) => Math.round((categories[id]?.score ?? 0) * 100);
    const ms = (id) => Math.round(audits[id]?.numericValue ?? 0);
    rows.push({
      ...target,
      slow4g: slow4gScore,
      performance: score("performance"),
      accessibility: score("accessibility"),
      fcp: ms("first-contentful-paint"),
      lcp: ms("largest-contentful-paint"),
      tbt: ms("total-blocking-time"),
      cls: (audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3),
    });
    const file = target.path.replace(/[/?=]+/g, "_").replace(/^_|_$/g, "") || "entry";
    writeFileSync(`lighthouse-reports/${file}.html`, result.report);
    console.log(
      `${target.name}: performance ${String(score("performance"))}, accessibility ${String(score("accessibility"))}`,
    );
  }
} finally {
  await chrome.kill();
  for (const server of servers) server.kill();
}

const s = (n) => `${(n / 1000).toFixed(1)} s`;
const table = [
  "| Tela | Rota | Performance (3G lento) | Acessibilidade | FCP | LCP | TBT | CLS | Performance (4G lento) |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.name} | \`${r.path}\` | ${String(r.performance)} | ${String(r.accessibility)} | ${s(r.fcp)} | ${s(r.lcp)} | ${String(r.tbt)} ms | ${r.cls} | ${String(r.slow4g)} |`,
  ),
].join("\n");

writeFileSync(
  "docs/performance.md",
  `# Performance

Gerado por \`npm run perf\` (${new Date().toISOString().slice(0, 10)}). Lighthouse ${"12"}, mobile 375 px, 3G lento simulado (RTT 400 ms, 400 kbps, CPU 4x). Meta do PRD (seção 9): Performance ≥ 90, Acessibilidade 100.

A T1 é medida no build de produção (\`dist/\`). As telas com sessão, no build de medição (\`dist-measure/\`, \`npm run build:measure\`): o mesmo build de produção com o mock na página e a sessão já aberta, para o Lighthouse abrir cada rota direto. Esse build nunca é publicado; \`scripts/check-build.mjs\` falha se o \`dist/\` tiver qualquer parte dele.

${table}

Relatórios completos: \`lighthouse-reports/\` (fora do git).
`,
);
console.log("docs/performance.md written");
