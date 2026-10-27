import type { Locale } from "@/api/types";
import { cx } from "@/lib/cx";
import { formatMoney, formatMoneyParts } from "@/lib/money";

interface MoneyProps {
  // Integer USD cents, as the API sends them.
  cents: number;
  locale: Locale;
  // "display": one headline figure in Fraunces. "inline": tabular Inter that inherits size.
  size?: "display" | "inline";
  className?: string;
}

export function Money({ cents, locale, size = "inline", className }: MoneyProps) {
  const text = formatMoney(cents, locale);

  if (size === "inline") {
    return (
      <span className={cx("font-sans whitespace-nowrap tabular-nums", className)}>{text}</span>
    );
  }

  // Statement style: small currency and cents set against the cap height of the whole units.
  const parts = formatMoneyParts(cents, locale);
  const sign = parts.filter((p) => p.type === "minusSign").map((p) => p.value);
  const currency = parts.find((p) => p.type === "currency")?.value;
  const units = parts
    .filter((p) => p.type === "integer" || p.type === "group")
    .map((p) => p.value)
    .join("");
  const decimals = parts
    .filter((p) => p.type === "decimal" || p.type === "fraction")
    .map((p) => p.value)
    .join("");

  return (
    <span className={cx("inline-block whitespace-nowrap", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden={true} className="inline-flex items-start">
        <span className="type-label mt-2 mr-1.5">
          {sign}
          {currency}
        </span>
        <span className="type-value-display">{units}</span>
        <span className="mt-1.5 font-serif text-2xl leading-none font-medium">{decimals}</span>
      </span>
    </span>
  );
}
