// Serves the built Storybook and runs e2e/a11y-stories.spec.ts against it.
import { spawn } from "node:child_process";

const port = "6106";
const server = spawn(process.execPath, ["scripts/serve-static.mjs", "storybook-static", port], {
  stdio: "inherit",
});
const run = spawn(
  "npx",
  [
    "playwright",
    "test",
    "e2e/a11y-stories.spec.ts",
    "--workers=2",
    ...process.argv.slice(2).map((arg) => JSON.stringify(arg)),
  ],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, STORYBOOK_URL: `http://127.0.0.1:${port}` },
  },
);
run.on("exit", (code) => {
  server.kill();
  process.exit(code ?? 1);
});
