// Serves the measure build and runs e2e/production.spec.ts against it (CSP, no page errors).
import { spawn } from "node:child_process";

const port = "4175";
const server = spawn(
  process.execPath,
  ["scripts/serve-static.mjs", "dist-measure", port, "--spa"],
  {
    stdio: "inherit",
  },
);
const run = spawn("npx", ["playwright", "test", "e2e/production.spec.ts"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, MEASURE_URL: `http://127.0.0.1:${port}` },
});
run.on("exit", (code) => {
  server.kill();
  process.exit(code ?? 1);
});
