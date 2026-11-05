// Runs after `npm run build` (postbuild): the production build must carry no mock, no measure
// session and the Content-Security-Policy. Fails the build otherwise.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Strings only the mock or the measure build contain.
const forbidden = [
  "mockServiceWorker",
  "opendollars-mock",
  "measure-session",
  "lucia.fernandez@example.com",
  "?scenario=",
];

const problems = [];
for (const file of files(dist)) {
  if (file.endsWith(".js") && /(^|[\\/])(msw|handlers|fixtures|scenarios)[-.]/.test(file)) {
    problems.push(`${file}: a mock chunk`);
  }
  if (!/\.(js|css|html)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const needle of forbidden) {
    if (text.includes(needle)) problems.push(`${file}: contains "${needle}"`);
  }
}

const html = readFileSync(join(dist, "index.html"), "utf8").replaceAll("&#39;", "'");
if (!/<meta http-equiv="Content-Security-Policy" content="[^"]*default-src 'self'/.test(html)) {
  problems.push("dist/index.html: no Content-Security-Policy meta");
}

if (problems.length > 0) {
  console.error(`check-build: the production build is not clean:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("check-build: dist/ has no mock, no measure session, and a CSP");
