import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";

interface WordmarkProps {
  size?: "sm" | "lg";
  // "inverse" for navy backgrounds. A prop, not className: two text colours in one class list
  // resolve by CSS order, and navy would win.
  tone?: "default" | "inverse";
  className?: string;
}

// TODO(decisão): placeholder mark until the real logo exists. Brief section 8: an open lock
// combined with a dollar stroke, never a coin or crypto block. Unlike the outline UI icons, the
// body is solid and the dollar stem cuts through it and out both ends, so it reads as a mark,
// not as an "unlock" button or a keyhole.
export function Wordmark({ size = "sm", tone = "default", className }: WordmarkProps) {
  const { t } = useTranslation();
  const maskId = `od-mark-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2",
        tone === "inverse" ? "text-cream-50" : "text-navy-900",
        className,
      )}
    >
      <svg
        aria-hidden={true}
        focusable={false}
        viewBox="0 0 24 24"
        className={size === "lg" ? "size-8" : "size-6"}
      >
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <rect x="11" y="10.5" width="2" height="10" fill="black" />
        </mask>
        {/* Open shackle */}
        <path
          d="M7.5 10.5V7.5a4.5 4.5 0 0 1 8.6-1.9"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Body, with the dollar stem cut out of it */}
        <rect
          x="4.5"
          y="10.5"
          width="15"
          height="10"
          rx="2.5"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
        {/* The stem's ends, above and below the body */}
        <rect x="11" y="6.5" width="2" height="4" fill="currentColor" />
        <rect x="11" y="20.5" width="2" height="2.5" fill="currentColor" />
      </svg>
      <span
        className={cx(
          // Sizes from the type scale: heading in the header, title on the entry screen.
          size === "lg" ? "type-title" : "type-heading",
        )}
      >
        {t("app.name")}
      </span>
    </span>
  );
}
