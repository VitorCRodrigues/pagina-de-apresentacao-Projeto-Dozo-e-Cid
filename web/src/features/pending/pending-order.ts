import type { Notification } from "@/api/proposed-types";
import type { PendingItem } from "@/api/types";

// T11 groups, money first: a deposit waiting on the client, then documents, terms, notices.
export const pendingKinds = ["deposit_action", "document", "terms", "notice"] as const;

export interface PendingGroup {
  kind: PendingItem["kind"];
  items: Notification[];
}

// Inside a group: deadlines first, the nearest on top; then the rest newest first. A full tie
// keeps the API order.
function compare(a: Notification, b: Notification): number {
  const dueA = a.dueAt === undefined ? null : Date.parse(a.dueAt);
  const dueB = b.dueAt === undefined ? null : Date.parse(b.dueAt);
  if (dueA !== null && dueB !== null) return dueA - dueB;
  if (dueA !== null) return -1;
  if (dueB !== null) return 1;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

// A read notification is done, whether or not the backend still lists it.
export function groupPending(items: readonly Notification[]): PendingGroup[] {
  const unread = items.filter((item) => item.readAt === undefined);
  return pendingKinds
    .map((kind) => ({
      kind,
      // Array.prototype.sort is stable, so ties keep the received order.
      items: unread.filter((item) => item.kind === kind).sort(compare),
    }))
    .filter((group) => group.items.length > 0);
}

export function isOverdue(item: Pick<Notification, "dueAt">, now: Date): boolean {
  return item.dueAt !== undefined && Date.parse(item.dueAt) < now.getTime();
}
