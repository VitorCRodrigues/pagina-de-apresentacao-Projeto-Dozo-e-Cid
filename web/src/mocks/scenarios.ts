import { accountStatuses, blockReasons, depositStates } from "@/api/schemas";

// Selectable with ?scenario=<id>: one per AccountStatus, DepositState and BlockReason, plus
// network conditions. Codes never collide, so the id is the code itself (?scenario=returned).
const networkScenarios = ["slow", "server_error", "empty", "maintenance"] as const;

export const scenarioIds = [
  ...accountStatuses,
  ...depositStates,
  ...blockReasons,
  ...networkScenarios,
] as const;

export type ScenarioId = (typeof scenarioIds)[number];

export const DEFAULT_SCENARIO: ScenarioId = "open";

export function isScenarioId(value: string): value is ScenarioId {
  return (scenarioIds as readonly string[]).includes(value);
}

export const scenarioGroups: readonly {
  group: "account" | "deposit" | "block" | "network";
  ids: readonly ScenarioId[];
}[] = [
  { group: "account", ids: accountStatuses },
  { group: "deposit", ids: depositStates },
  { group: "block", ids: blockReasons },
  { group: "network", ids: networkScenarios },
];
