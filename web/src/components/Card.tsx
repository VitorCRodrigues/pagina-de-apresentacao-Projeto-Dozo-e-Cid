import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

interface CardProps extends ComponentProps<"section"> {
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

// A statement line: label on the left, tabular value on the right, hairline between rows.
export function CardRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "flex items-baseline justify-between gap-4 border-t border-gray-200 py-3 first:border-t-0",
        className,
      )}
      {...props}
    />
  );
}
