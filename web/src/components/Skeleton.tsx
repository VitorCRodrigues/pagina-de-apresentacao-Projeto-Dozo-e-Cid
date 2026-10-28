import { cx } from "@/lib/cx";

// Size it with className (h-*, w-*). Static, no pulse: the page stays calm while it loads.
// Decorative: LoadingState announces the loading itself.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden={true} className={cx("rounded-control bg-gray-100", className)} />;
}
