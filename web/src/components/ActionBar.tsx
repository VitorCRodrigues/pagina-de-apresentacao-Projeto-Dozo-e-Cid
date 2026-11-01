import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Fixed to the bottom of the viewport, inside the 480 px column: a flow's one primary action
// stays in reach of the thumb. A hairline above it, like the foot of a statement page.
// Screens that use it keep bottom padding (pb-24) so their content never hides behind it.
// Under the app's bottom navigation (AppShell data-nav) it sits right above the tabs, which
// keep the safe area: 3.5 rem of tabs plus their hairline (below lg; see BottomNav).
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-cream-50",
        "pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
        "in-data-nav:bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] in-data-nav:pb-0",
        // From lg up the tabs live in the header: back to the bottom edge.
        "lg:in-data-nav:bottom-0 lg:in-data-nav:pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="mx-auto flex max-w-[480px] items-center gap-4 px-5 py-3">{children}</div>
    </div>
  );
}
