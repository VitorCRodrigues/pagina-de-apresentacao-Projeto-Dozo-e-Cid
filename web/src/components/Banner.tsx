import { CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export type BannerTone = "info" | "warning" | "error";

const tones: Record<BannerTone, { className: string; icon: LucideIcon }> = {
  info: { className: "bg-navy-50 text-navy-900", icon: Info },
  warning: { className: "bg-amber-50 text-amber-700", icon: TriangleAlert },
  error: { className: "bg-brick-50 text-brick-700", icon: CircleAlert },
};

interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Banner({ tone = "info", title, children, action, className }: BannerProps) {
  const { className: toneClass, icon } = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-control p-4", toneClass, className)}
    >
      <Icon icon={icon} className="mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="type-label">{title}</p>
        {children && <div className="type-caption text-graphite-900">{children}</div>}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
