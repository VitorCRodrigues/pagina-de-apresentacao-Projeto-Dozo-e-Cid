import type { DepositState } from "@/api/types";

// The Aportar tab splits deposits in two, with no overlap: "En curso" holds the ones still
// moving, the history (T10) holds the finished ones. kyc_passed and ibkr_open are account steps.
export const inProgressStates: readonly DepositState[] = [
  "deposit_notified",
  "partner_collected",
  "fx_executed",
  "wire_sent",
  "broker_credited",
];

export const historyFilters = ["all", "invested", "returned"] as const;
export type HistoryFilter = (typeof historyFilters)[number];

const filterStates: Record<HistoryFilter, readonly DepositState[]> = {
  all: ["invested", "returned"],
  invested: ["invested"],
  returned: ["returned"],
};

export function statesFor(filter: HistoryFilter): readonly DepositState[] {
  return filterStates[filter];
}

export function isInProgress(deposit: { state: DepositState }): boolean {
  return inProgressStates.includes(deposit.state);
}

// The API already sends newest first; this keeps the screen right if a page arrives unsorted.
export function newestFirst<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, time: Date.parse(item.createdAt) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ item }) => item);
}
