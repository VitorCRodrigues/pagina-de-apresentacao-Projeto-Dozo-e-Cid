import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Locale, Position } from "@/api/types";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { formatPercent } from "@/lib/money";
import { weightComparison } from "./weights";

// T9 holdings. Each fund reads like a statement entry: name, ISIN and shares, value, then the
// weight against the model's target on a thin neutral bar. The description comes from the API.
export function PositionList({
  positions,
  locale,
}: {
  positions: readonly Position[];
  locale: Locale;
}) {
  const { t } = useTranslation("portfolio");
  return (
    <ul aria-label={t("portfolio.positions.title")} className="border-y border-gray-200">
      {positions.map((position) => (
        <PositionItem key={position.isin} position={position} locale={locale} />
      ))}
    </ul>
  );
}

function PositionItem({ position, locale }: { position: Position; locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const weight = weightComparison(position.weight, position.targetWeight);
  const percent = (bp: number) => formatPercent(bp / 10000, locale);

  return (
    <li className="flex flex-col gap-3 border-t border-gray-200 py-5 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="type-label text-graphite-900">{position.name}</h3>
          <p className="type-caption text-gray-600 tabular-nums">
            {position.isin} · {t("portfolio.positions.shares", { count: position.shares })}
          </p>
        </div>
        <Money
          cents={position.valueCents}
          locale={locale}
          className="type-value text-graphite-900"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div aria-hidden={true} className="relative h-0.5 bg-gray-200">
          <span
            className="absolute inset-y-0 left-0 bg-navy-900"
            style={{ width: `${String(weight.barBp / 100)}%` }}
          />
          {/* The model's target: a short graphite tick across the track. */}
          <span
            className="absolute -top-1.5 h-3.5 w-px -translate-x-1/2 bg-graphite-900"
            style={{ left: `${String(weight.markerBp / 100)}%` }}
          />
        </div>
        <p className="type-caption text-gray-600 tabular-nums">
          {t("portfolio.positions.weight", {
            current: percent(weight.currentBp),
            target: percent(weight.targetBp),
          })}
        </p>
      </div>

      <details className="group">
        <summary className="type-caption inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-navy-900 [&::-webkit-details-marker]:hidden">
          {t("portfolio.positions.about")}
          <Icon
            icon={ChevronDown}
            size={16}
            className="transition-transform duration-fast group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <p className="type-body max-w-prose pt-1 text-graphite-900">{position.description}</p>
      </details>
    </li>
  );
}
