import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "key";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  loading?: boolean;
  // "mobile": full width below 640 px, auto above (the default for screen actions).
  fullWidth?: "mobile" | "always" | "never";
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy-900 text-cream-50 hover:bg-navy-800",
  secondary: "border border-navy-900 text-navy-900 hover:bg-gray-50",
  // Reads as a text link: everything that is not the one primary action (direction doc).
  ghost: "text-green-700 underline decoration-1 underline-offset-4 hover:decoration-2 px-1",
  destructive: "bg-brick-700 text-white hover:opacity-90",
  // Gold is reserved for one key action per screen, always with navy text.
  key: "bg-gold-500 text-navy-900 hover:bg-gold-600",
};

const widths = {
  mobile: "w-full sm:w-auto",
  always: "w-full",
  never: "",
} as const;

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
        "type-label inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5",
        "transition-colors duration-fast ease-od",
        variant === "ghost" && "min-h-11",
        isDisabled && variant !== "ghost"
          ? "cursor-not-allowed border-0 bg-gray-100 text-gray-500"
          : isDisabled
            ? "cursor-not-allowed text-gray-500 no-underline"
            : variants[variant],
        widths[fullWidth],
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
