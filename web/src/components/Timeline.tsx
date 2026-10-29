import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/api/types";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/dates";
import { Icon } from "./Icon";

export type TimelineStatus = "done" | "current" | "upcoming" | "error";

export interface TimelineStep {
  id: string;
  label: string;
  status: TimelineStatus;
  // ISO 8601 UTC; shown in the browser's time zone.
  at?: string;
  note?: ReactNode;
}

interface TimelineProps {
  label: string;
  steps: readonly TimelineStep[];
  locale: Locale;
}

const labelStyles: Record<TimelineStatus, string> = {
  done: "type-body text-graphite-900",
  current: "type-label text-navy-900",
  upcoming: "type-body text-gray-600",
  error: "type-label text-brick-700",
};

function Dot({ status }: { status: TimelineStatus }) {
  const base = "relative z-10 inline-flex size-5 items-center justify-center rounded-full";
  switch (status) {
    case "done":
      return (
        <span className={cx(base, "bg-green-700 text-cream-50")}>
          <Icon icon={Check} size={12} />
        </span>
      );
    case "current":
      return (
        <span className={cx(base, "border-2 border-navy-900 bg-paper")}>
          <span className="size-2 rounded-full bg-navy-900" />
        </span>
      );
    case "error":
      return (
        <span className={cx(base, "bg-brick-700 text-cream-50")}>
          <Icon icon={X} size={12} />
        </span>
      );
    case "upcoming":
      return <span className={cx(base, "border border-gray-500 bg-cream-50")} />;
  }
}

// Vertical status timeline. An ordered list with aria-current="step", so screen readers get
// position, status and local time for every step.
export function Timeline({ label, steps, locale }: TimelineProps) {
  const { t } = useTranslation();

  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.id}
            {...(step.status === "current" && { "aria-current": "step" as const })}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            <span aria-hidden={true} className="relative flex w-5 shrink-0 justify-center pt-0.5">
              <Dot status={step.status} />
              {!isLast && (
                <span
                  className={cx(
                    // Down through the item's bottom padding (pb-6) to the next dot (pt-0.5).
                    "absolute top-6 -bottom-6 w-px",
                    step.status === "done" ? "bg-green-700" : "bg-gray-200",
                  )}
                />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className={labelStyles[step.status]}>
                {step.label}
                <span className="sr-only">, {t(`timeline.status.${step.status}`)}</span>
              </p>
              {step.at && (
                <time dateTime={step.at} className="type-caption text-gray-600 tabular-nums">
                  {formatDateTime(step.at, locale)}
                </time>
              )}
              {step.note && <div className="type-caption mt-1 text-graphite-900">{step.note}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
