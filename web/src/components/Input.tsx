import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { controlFrame } from "./component-styles";
import { useFieldControl } from "./field-context";

interface InputProps extends ComponentProps<"input"> {
  // Fixed text before the value, e.g. the currency of an amount.
  leading?: ReactNode;
  // "amount": the value is the screen's focus, set in tabular Inter at type-value-lg.
  variant?: "default" | "amount";
}

export function Input({ leading, variant = "default", className, disabled, ...props }: InputProps) {
  const text = variant === "amount" ? "type-value-lg" : "type-body";
  const field = useFieldControl();
  const invalid = field?.["aria-invalid"] === true;

  return (
    <div
      className={cx(
        controlFrame,
        invalid ? "border-brick-700" : "border-gray-500",
        disabled && "border-gray-200 bg-gray-50",
        className,
      )}
    >
      {leading && <span className={cx(text, "shrink-0 text-gray-600")}>{leading}</span>}
      <input
        {...field}
        disabled={disabled}
        className={cx(
          text,
          "min-w-0 flex-1 bg-transparent py-3 text-graphite-900 outline-none",
          "placeholder:text-gray-600 disabled:cursor-not-allowed disabled:text-gray-500",
        )}
        {...props}
      />
    </div>
  );
}
