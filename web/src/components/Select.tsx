import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { useFieldControl } from "./field-context";
import { Icon } from "./Icon";
import { controlFrame } from "./component-styles";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// A native <select> in the field frame. On a phone it opens the system picker, and unlike a
// popover listbox it never hides the rest of the page from assistive technology (axe
// aria-hidden-focus). The placeholder is a disabled first option: shown, never chosen back.
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
}: SelectProps) {
  const { t } = useTranslation();
  const field = useFieldControl();
  const invalid = field?.["aria-invalid"] === true;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  // A value no option carries (an unknown code, "undefined") shows the placeholder: a native
  // select would otherwise show its first option as if the client had picked it.
  const wanted = value ?? uncontrolled;
  const current = options.some((option) => option.value === wanted) ? wanted : "";

  return (
    <div
      className={cx(
        controlFrame,
        "relative p-0",
        disabled ? "border-gray-200 bg-gray-50" : invalid ? "border-brick-700" : "border-gray-500",
      )}
    >
      <select
        {...field}
        value={current}
        disabled={disabled}
        onChange={(event) => {
          if (value === undefined) setUncontrolled(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={cx(
          "type-body min-h-12 w-full cursor-pointer appearance-none bg-transparent py-3 pr-10 pl-3 outline-none",
          "disabled:cursor-not-allowed disabled:text-gray-500",
          current === "" ? "text-gray-600" : "text-graphite-900",
        )}
      >
        <option value="" disabled>
          {placeholder ?? t("select.placeholder")}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-graphite-900">
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        icon={ChevronDown}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-600"
      />
    </div>
  );
}
