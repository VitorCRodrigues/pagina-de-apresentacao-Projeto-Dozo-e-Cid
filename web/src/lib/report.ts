// Events for error monitoring. The event is a fixed code and the key a non-personal tag (such as
// a reconciliation date): never amounts, names or ids (CLAUDE.md), so it is safe to send.
export type IssueEvent = "portfolio_total_mismatch";

const reported = new Set<string>();

// Once per event and key in a session: screens that mount again do not inflate the counts.
export function reportIssue(event: IssueEvent, key = ""): void {
  const id = `${event}:${key}`;
  if (reported.has(id)) return;
  reported.add(id);
  if (import.meta.env.DEV) console.warn(`[opendollars] ${event}`);
  // TODO(decisão): send `event` to the error-monitoring service once one is chosen.
}
