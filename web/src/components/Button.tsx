import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
export type { ButtonVariant } from "./component-styles";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { buttonBase, buttonVariants, buttonWidths, type ButtonVariant } from "./component-styles";
import { Icon } from "./Icon";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  loading?: boolean;
  // "mobile": full width below 640 px, auto above (the default for screen actions).
  fullWidth?: keyof typeof buttonWidths;
}

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = "mobile",
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const { t } = useTranslation();
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        buttonBase,
        variant === "ghost" && "min-h-11",
        // Loading keeps the variant colours: the action is in progress, not unavailable.
        loading
          ? cx(buttonVariants[variant], "cursor-progress")
          : disabled && variant !== "ghost"
            ? "cursor-not-allowed border-0 bg-gray-100 text-gray-500"
            : disabled
              ? "cursor-not-allowed text-gray-500 no-underline"
              : buttonVariants[variant],
        buttonWidths[fullWidth],
        className,
      )}
      {...props}
    >
      {loading && (
        <>
          <Icon icon={LoaderCircle} className="motion-safe:animate-spin" />
          <span className="sr-only">{t("common.loading")}</span>
        </>
      )}
      {children}
    </button>
  );
}
