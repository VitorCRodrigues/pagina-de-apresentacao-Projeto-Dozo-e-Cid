import { RadioGroup } from "radix-ui";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface RadioCardGroupProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

// Options listed like statement lines, between hairlines; no boxes.
export function RadioCardGroup({
  label,
  value,
  defaultValue,
  onValueChange,
  children,
}: RadioCardGroupProps) {
  return (
    <RadioGroup.Root
      aria-label={label}
      {...(value !== undefined && { value })}
      {...(defaultValue !== undefined && { defaultValue })}
      {...(onValueChange && { onValueChange })}
      className="flex flex-col border-y border-gray-200"
    >
      {children}
    </RadioGroup.Root>
  );
}

interface RadioCardProps {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  // Why this option is recommended, as a line of text inside it (no corner badge).
  recommendation?: ReactNode;
  disabled?: boolean;
}

export function RadioCard({ value, title, description, recommendation, disabled }: RadioCardProps) {
  return (
    <RadioGroup.Item
      value={value}
      {...(disabled !== undefined && { disabled })}
      className={cx(
        "group flex w-full items-start gap-3 border-t border-gray-200 py-4 text-left first:border-t-0",
        "transition-colors duration-fast ease-od",
        "disabled:cursor-not-allowed",
      )}
    >
      <span
        aria-hidden={true}
        className={cx(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-500",
          "group-hover:border-navy-900 group-data-[state=checked]:border-2 group-data-[state=checked]:border-navy-900",
          "group-disabled:border-gray-200",
        )}
      >
        <RadioGroup.Indicator className="size-2.5 rounded-full bg-navy-900" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-label text-graphite-900 group-disabled:text-gray-500">{title}</span>
        {description && <span className="type-caption text-gray-600">{description}</span>}
        {recommendation && (
          <span className="type-caption font-semibold text-green-700">{recommendation}</span>
        )}
      </span>
    </RadioGroup.Item>
  );
}
