import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error";

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-gray-50 text-gray-600", dot: "bg-gray-500" },
  info: { badge: "bg-navy-50 text-navy-900", dot: "bg-navy-900" },
  success: { badge: "bg-green-50 text-green-700", dot: "bg-green-700" },
  warning: { badge: "bg-amber-50 text-amber-700", dot: "bg-amber-700" },
  error: { badge: "bg-brick-50 text-brick-700", dot: "bg-brick-700" },
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

// Status is carried by the text; colour and dot only reinforce it.
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "type-caption inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 font-semibold",
        tones[tone].badge,
        className,
      )}
    >
      <span aria-hidden={true} className={cx("size-1.5 rounded-full", tones[tone].dot)} />
      {children}
    </span>
  );
}
