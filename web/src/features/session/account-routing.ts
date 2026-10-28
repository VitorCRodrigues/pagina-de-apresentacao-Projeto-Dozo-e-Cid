import type { AccountStatus } from "@/api/types";
import { paths } from "@/routes";

// "restricted" happens after the account opened: navigation stays, deposits are blocked
// inside the screens (decisions.md, item 14).
export function hasOpenedAccount(status: AccountStatus): boolean {
  return status === "open" || status === "restricted";
}

// Where a signed-in client belongs. Before "open" only onboarding and account status exist.
export function landingPathFor(status: AccountStatus): string {
  if (hasOpenedAccount(status)) return paths.home;
  if (status === "draft") return paths.onboarding;
  return paths.accountStatus;
}
