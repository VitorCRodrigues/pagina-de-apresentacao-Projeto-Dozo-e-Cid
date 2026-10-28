import { buildMockDb, type MockDb } from "./db";
import type { ScenarioId } from "./scenarios";
import { currentScenario } from "./scenario-state";

// One db per active scenario, kept across requests so created plans and deposits and the
// idempotency keys persist; a different scenario starts a fresh db.
let cache: { scenario: ScenarioId; db: MockDb } | null = null;

export function getMockDb(): MockDb {
  const scenario = currentScenario();
  if (!cache || cache.scenario !== scenario) cache = { scenario, db: buildMockDb(scenario) };
  return cache.db;
}

// Tests start every case from a clean db.
export function resetMockDb(): void {
  cache = null;
}
