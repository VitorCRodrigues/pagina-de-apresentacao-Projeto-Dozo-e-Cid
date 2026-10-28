import { DEFAULT_SCENARIO, isScenarioId, type ScenarioId } from "./scenarios";

const STORAGE_KEY = "od.mock.scenario";
let override: ScenarioId | null = null;

// Tests and stories pin a scenario directly; null goes back to the URL.
export function setScenario(id: ScenarioId | null): void {
  override = id;
}

// ?scenario= wins and is remembered for the tab, so in-app navigation keeps it.
// Only the scenario id is stored, never personal data.
export function currentScenario(): ScenarioId {
  if (override) return override;
  if (typeof window === "undefined") return DEFAULT_SCENARIO;

  const fromUrl = new URLSearchParams(window.location.search).get("scenario");
  try {
    if (fromUrl && isScenarioId(fromUrl)) {
      window.sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored && isScenarioId(stored)) return stored;
  } catch {
    // Storage blocked: fall back to the URL value or the default.
    if (fromUrl && isScenarioId(fromUrl)) return fromUrl;
  }
  return DEFAULT_SCENARIO;
}

// The current URL with ?scenario=<id> set, keeping the path, other parameters and the hash.
export function scenarioUrl(id: ScenarioId, href: string): string {
  const url = new URL(href);
  url.searchParams.set("scenario", id);
  return url.toString();
}
