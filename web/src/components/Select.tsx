import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
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
  defaultOpen?: boolean;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  defaultOpen,
}: SelectProps) {
  const { t } = useTranslation();
  const field = useFieldControl();
  const invalid = field?.["aria-invalid"] === true;

  return (
    <RadixSelect.Root
      {...(value !== undefined && { value })}
      {...(defaultValue !== undefined && { defaultValue })}
      {...(onValueChange && { onValueChange })}
      {...(disabled !== undefined && { disabled })}
      {...(defaultOpen !== undefined && { defaultOpen })}
    >
      <RadixSelect.Trigger
        {...field}
        className={cx(
          controlFrame,
          "type-body justify-between py-3 text-left text-graphite-900 outline-none",
          "data-[placeholder]:text-gray-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500",
          invalid ? "border-brick-700" : "border-gray-500",
        )}
      >
        <RadixSelect.Value placeholder={placeholder ?? t("select.placeholder")} />
        <RadixSelect.Icon>
          <Icon icon={ChevronDown} className="text-gray-600" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cx(
            "z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]",
            "overflow-hidden rounded-control border border-gray-200 bg-paper shadow-overlay",
            "data-[state=open]:animate-[od-fade-in_var(--od-duration-fast)_var(--od-ease)]",
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={cx(
                  "type-body relative flex min-h-11 cursor-default items-center rounded-control py-2 pr-3 pl-9 outline-none select-none",
                  "data-[highlighted]:bg-gray-50 data-[state=checked]:font-semibold",
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-3 inline-flex text-navy-900">
                  <Icon icon={Check} size={16} />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
