// Serves a built folder (storybook-static, dist-measure) for the a11y and performance runs.
// Usage: node scripts/serve-static.mjs <dir> <port> [--spa]
// --spa answers unknown paths with index.html, as the app's host will.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const [dir = "storybook-static", port = "6106", flag] = process.argv.slice(2);
const root = resolve(dir);
const spa = flag === "--spa";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  let file = normalize(join(root, path));
  // root + sep: "storybook-static-other" must not pass as inside "storybook-static".
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    if (!spa) {
      response.writeHead(404).end();
      return;
    }
    file = join(root, "index.html");
  }
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
  // Loopback only: a local tool, never reachable from the network.
}).listen(Number(port), "127.0.0.1", () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
