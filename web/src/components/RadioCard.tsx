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
      className="flex flex-col gap-3"
    >
      {children}
    </RadioGroup.Root>
  );
}

interface RadioCardProps {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  // Right-hand detail such as a badge or a cost.
  aside?: ReactNode;
  disabled?: boolean;
}

export function RadioCard({ value, title, description, aside, disabled }: RadioCardProps) {
  return (
    <RadioGroup.Item
      value={value}
      {...(disabled !== undefined && { disabled })}
      className={cx(
        "group flex w-full items-start gap-3 rounded-card border bg-paper p-4 text-left",
        "transition-colors duration-fast ease-od",
        "border-gray-200 hover:border-gray-500",
        "data-[state=checked]:border-navy-900 data-[state=checked]:outline-1 data-[state=checked]:outline-navy-900",
        "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:hover:border-gray-200",
      )}
    >
      <span
        aria-hidden={true}
        className={cx(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-500",
          "group-data-[state=checked]:border-navy-900",
        )}
      >
        <RadioGroup.Indicator className="size-2.5 rounded-full bg-navy-900" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-3">
          <span className="type-label text-graphite-900 group-disabled:text-gray-500">{title}</span>
          {aside}
        </span>
        {description && <span className="type-caption text-gray-600">{description}</span>}
      </span>
    </RadioGroup.Item>
  );
}
