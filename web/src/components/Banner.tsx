import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type BannerTone = "info" | "warning" | "error";

// A margin note on the statement: a thin side rule and text, no tinted box. The tone lives in the
// rule and the title colour; the title itself always says what happened.
const tones: Record<BannerTone, { rule: string; title: string }> = {
  info: { rule: "border-navy-900", title: "text-navy-900" },
  warning: { rule: "border-amber-700", title: "text-amber-700" },
  error: { rule: "border-brick-700", title: "text-brick-700" },
};

interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Banner({ tone = "info", title, children, action, className }: BannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex flex-col gap-1 border-l-2 py-1 pl-4", tones[tone].rule, className)}
    >
      <p className={cx("type-label", tones[tone].title)}>{title}</p>
      {children && <div className="type-caption text-graphite-900">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
