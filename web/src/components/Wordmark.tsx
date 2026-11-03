import { useTranslation } from "react-i18next";
import wordmark from "@/assets/brand/wordmark.png";
import wordmarkCream from "@/assets/brand/wordmark-cream.png";
import { cx } from "@/lib/cx";

interface WordmarkProps {
  size?: "sm" | "lg";
  // "inverse" for navy backgrounds: the cream version of the wordmark.
  tone?: "default" | "inverse";
  className?: string;
}

// The official flat wordmark (src/assets/brand). The gradient artwork never goes in the app.
// TODO(decisão): raster built from the PNG artwork by scripts/brand-assets.py; swap for the
// designer's SVG when it exists.
export function Wordmark({ size = "sm", tone = "default", className }: WordmarkProps) {
  const { t } = useTranslation();

  return (
    <img
      src={tone === "inverse" ? wordmarkCream : wordmark}
      alt={t("app.name")}
      // The files' own size (624 x 120), so the browser reserves the box before they load.
      width={624}
      height={120}
      // self-start: in a flex column it would otherwise stretch to the full width.
      className={cx("block w-auto self-start", size === "lg" ? "h-10" : "h-8", className)}
    />
  );
}
