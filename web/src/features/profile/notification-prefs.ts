import type { NotificationPrefs } from "@/api/proposed-types";

// PATCH /me/notifications takes a partial body (api-gaps.md, item 10): only what changed, so two
// quick toggles never overwrite each other. Null when there is nothing to send.
export function prefsPatch(
  current: NotificationPrefs,
  field: keyof NotificationPrefs,
  checked: boolean,
): Partial<NotificationPrefs> | null {
  return current[field] === checked ? null : { [field]: checked };
}
