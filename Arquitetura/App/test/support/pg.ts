// Throwaway Postgres cluster for integration tests. Returns null when Postgres binaries are not installed.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

export const havePg = spawnSync("initdb", ["--version"]).status === 0;

export async function startPg() {
  const dir = mkdtempSync(join(tmpdir(), "od-pg-"));
  const port = 54000 + Math.floor(Math.random() * 900);
  execFileSync("initdb", ["-D", join(dir, "data"), "-A", "trust", "-U", "postgres"], { stdio: "ignore" });
  execFileSync("pg_ctl", ["-D", join(dir, "data"), "-o", `-k ${dir} -p ${port} -c listen_addresses=''`, "-w", "start"], { stdio: "ignore" });
  const r = spawnSync("psql", ["-h", dir, "-p", String(port), "-U", "postgres", "-d", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "db/schema.sql"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  const pool = new pg.Pool({ host: dir, port, user: "postgres", database: "postgres", max: 8 });
  return {
    pool,
    async stop() {
      await pool.end();
      spawnSync("pg_ctl", ["-D", join(dir, "data"), "-m", "immediate", "stop"]);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
