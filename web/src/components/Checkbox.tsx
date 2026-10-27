import { Check } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

interface CheckboxProps {
  label: ReactNode;
  // Rendered outside the <label>, so a link here stays its own target.
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}

export function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
}: CheckboxProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className="flex items-start gap-3">
      <RadixCheckbox.Root
        id={id}
        {...(checked !== undefined && { checked })}
        {...(defaultChecked !== undefined && { defaultChecked })}
        {...(onCheckedChange && {
          onCheckedChange: (value: boolean | "indeterminate") => {
            onCheckedChange(value === true);
          },
        })}
        {...(disabled !== undefined && { disabled })}
        {...(required !== undefined && { required })}
        {...(description ? { "aria-describedby": descriptionId } : {})}
        className={cx(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-gray-500 bg-paper",
          "transition-colors duration-fast ease-od",
          "data-[state=checked]:border-navy-900 data-[state=checked]:bg-navy-900 data-[state=checked]:text-cream-50",
          "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50",
        )}
      >
        <RadixCheckbox.Indicator>
          <Icon icon={Check} size={16} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={id}
          className={cx("type-body", disabled ? "text-gray-500" : "text-graphite-900")}
        >
          {label}
        </label>
        {description && (
          <div id={descriptionId} className="type-caption text-gray-600">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
