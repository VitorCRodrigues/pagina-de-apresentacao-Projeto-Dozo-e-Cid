import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Statement lines: label on the left, tabular value on the right, hairlines between rows and
// rules above and below. Use this for lists of values; keep Card for real groupings.
export function Ledger({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cx("border-y border-gray-200", className)}>{children}</dl>;
}

interface LedgerRowProps {
  label: ReactNode;
  children: ReactNode;
}

export function LedgerRow({ label, children }: LedgerRowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-gray-200 py-3 first:border-t-0">
      {/* The label never wraps. A value that does not fit beside it moves to the next line,
          whole and right-aligned; only a value longer than the row wraps inside itself. */}
      <dt className="type-body shrink-0 text-graphite-900">{label}</dt>
      <dd className="type-value ml-auto min-w-0 text-right text-graphite-900">{children}</dd>
    </div>
  );
}
