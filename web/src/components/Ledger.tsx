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
    <div className="flex items-baseline justify-between gap-4 border-t border-gray-200 py-3 first:border-t-0">
      {/* The label never wraps; a long text value may. Money keeps itself on one line. */}
      <dt className="type-body shrink-0 text-graphite-900">{label}</dt>
      <dd className="type-value min-w-0 text-right text-graphite-900">{children}</dd>
    </div>
  );
}
