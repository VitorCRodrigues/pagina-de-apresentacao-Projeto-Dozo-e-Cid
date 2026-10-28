import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";

interface WordmarkProps {
  size?: "sm" | "lg";
  className?: string;
}

// TODO(decisão): placeholder mark until the real logo exists. Brief section 8: an open lock
// with a single upright stroke, never a coin or crypto block.
export function Wordmark({ size = "sm", className }: WordmarkProps) {
  const { t } = useTranslation();
  return (
    <span className={cx("inline-flex items-center gap-2 text-navy-900", className)}>
      <svg
        aria-hidden={true}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === "lg" ? "size-8" : "size-6"}
      >
        <path d="M8 10.5V7a4 4 0 0 1 7.7-1.5" />
        <rect x="5" y="10.5" width="14" height="10.5" rx="2" />
        <path d="M12 13.5v4.5" />
      </svg>
      <span
        className={cx(
          "font-serif font-semibold tracking-tight",
          size === "lg" ? "text-[1.625rem] leading-none" : "text-lg leading-none",
        )}
      >
        {t("app.name")}
      </span>
    </span>
  );
}
