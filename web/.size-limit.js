// Initial bundle = every JS/CSS file dist/index.html loads before any lazy route (PRD section 9).
import { existsSync, readFileSync } from "node:fs";

const html = "dist/index.html";
if (!existsSync(html)) throw new Error("dist/index.html not found: run `npm run build` first.");

const assets = [
  ...readFileSync(html, "utf8").matchAll(
    /<(?:script|link)\b[^>]*?(?:src|href)="\/(assets\/[^"]+)"/g,
  ),
].map((match) => `dist/${match[1]}`);

export default [
  {
    name: "Initial bundle (JS + CSS loaded by index.html)",
    path: assets,
    gzip: true,
    limit: "200 kB",
  },
];
