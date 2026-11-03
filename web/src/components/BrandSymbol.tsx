import { useTranslation } from "react-i18next";
import symbol from "@/assets/brand/symbol.png";
import symbolCream from "@/assets/brand/symbol-cream.png";
import { cx } from "@/lib/cx";

interface BrandSymbolProps {
  // "inverse" for navy backgrounds: the cream version of the symbol.
  tone?: "default" | "inverse";
  className?: string;
}

// The flat symbol alone, for the app header: inside the app the screen title right below names
// the page, so the full wordmark stays on the entry screen (T1).
// TODO(decisão): raster built from the PNG artwork by scripts/brand-assets.py; swap for the
// designer's SVG when it exists.
export function BrandSymbol({ tone = "default", className }: BrandSymbolProps) {
  const { t } = useTranslation();

  return (
    <img
      src={tone === "inverse" ? symbolCream : symbol}
      alt={t("app.name")}
      // The files' own size (150 x 120), so the browser reserves the box before they load.
      width={150}
      height={120}
      className={cx("block h-8 w-auto", className)}
    />
  );
}
