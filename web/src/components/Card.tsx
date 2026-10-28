import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

interface CardProps extends ComponentProps<"section"> {
  // Only for real groupings (one plan, the total balance). Lists of values use Ledger.
  // "paper": a statement sheet on the cream desk. "inverse": navy header for the total balance.
  tone?: "paper" | "inverse";
}

export function Card({ tone = "paper", className, ...props }: CardProps) {
  return (
    <section
      className={cx(
        "rounded-card p-5",
        tone === "paper"
          ? "border border-gray-200 bg-paper text-graphite-900 shadow-hairline"
          : "bg-navy-900 text-cream-50",
        className,
      )}
      {...props}
    />
  );
}
