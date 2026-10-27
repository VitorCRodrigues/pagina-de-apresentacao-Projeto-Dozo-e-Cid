import { useTranslation } from "react-i18next";
import type { CostLine, Locale } from "@/api/types";
import { cx } from "@/lib/cx";
import { formatMoney, formatPercent } from "@/lib/money";

interface CostTableProps {
  lines: readonly CostLine[];
  amountCents: number;
  totalCostCents: number;
  netToInvestCents: number;
  locale: Locale;
  caption?: string;
}

const amountCell = "py-3 text-right whitespace-nowrap tabular-nums";
const percentCell =
  "type-caption px-3 py-3 text-right whitespace-nowrap text-gray-600 tabular-nums";

// Cost preview as a statement: one rule above the total, a double rule above the amount
// that arrives to invest. Labels come from i18n by kind.
// TODO(decisão): CostLine.label from the API is ignored until its language is defined.
export function CostTable({
  lines,
  amountCents,
  totalCostCents,
  netToInvestCents,
  locale,
  caption,
}: CostTableProps) {
  const { t } = useTranslation();
  // Display-only ratio; the amounts themselves stay integers.
  const totalRatio = amountCents > 0 ? totalCostCents / amountCents : 0;

  return (
    <table className="w-full border-collapse">
      <caption className="type-label pb-2 text-left text-navy-900">
        {caption ?? t("costs.caption")}
      </caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t("costs.item")}</th>
          <th scope="col">{t("costs.percent")}</th>
          <th scope="col">{t("costs.amount")}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.kind} className="border-t border-gray-200 align-baseline">
            <th scope="row" className="type-body py-3 text-left font-normal">
              {t(`costs.kind.${line.kind}`)}
              {line.estimated && (
                <span className="type-caption block text-gray-600">{t("costs.estimated")}</span>
              )}
            </th>
            <td className={percentCell}>{formatPercent(line.percent, locale)}</td>
            <td className={cx("type-body", amountCell)}>{formatMoney(line.amountCents, locale)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-graphite-900 align-baseline">
          <th scope="row" className="type-label py-3 text-left">
            {t("costs.total")}
          </th>
          <td className={percentCell}>{formatPercent(totalRatio, locale)}</td>
          <td className={cx("type-value", amountCell)}>{formatMoney(totalCostCents, locale)}</td>
        </tr>
        <tr className="border-t-[3px] border-double border-graphite-900 align-baseline">
          <th scope="row" className="type-label pt-4 text-left text-green-700">
            {t("costs.net")}
          </th>
          <td />
          <td className={cx("type-value-lg pt-4 text-right whitespace-nowrap text-green-700")}>
            {formatMoney(netToInvestCents, locale)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
