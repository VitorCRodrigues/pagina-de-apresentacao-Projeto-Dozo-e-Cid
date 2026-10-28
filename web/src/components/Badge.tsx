import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error";

// Status as a line of small text with the same markers as the Timeline: filled green for done,
// a navy ring for in progress, a hollow grey dot for not started, amber and brick for attention.
// No pill: the text carries the status, the marker only echoes it.
const markers: Record<BadgeTone, string> = {
  neutral: "border border-gray-500",
  info: "border-2 border-navy-900",
  success: "bg-green-700",
  warning: "border-2 border-amber-700",
  error: "bg-brick-700",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "type-caption inline-flex items-center gap-1.5 font-semibold text-graphite-900",
        className,
      )}
    >
      <span aria-hidden={true} className={cx("size-2 shrink-0 rounded-full", markers[tone])} />
      {children}
    </span>
  );
}
