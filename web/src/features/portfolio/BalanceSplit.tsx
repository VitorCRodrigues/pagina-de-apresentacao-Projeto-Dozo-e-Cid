import { useTranslation } from "react-i18next";
import type { Locale, Portfolio } from "@/api/types";
import { Ledger } from "@/components/Ledger";
import { Money } from "@/components/Money";
import { cx } from "@/lib/cx";
import { formatMoney, formatPercent } from "@/lib/money";
import { type Bucket, buckets, bucketShares, bucketsTotalCents, centsOf } from "./balances";

// Neutral tones only: the split says where the money is, never whether it gained or lost.
const swatch: Record<Bucket, string> = {
  invested: "bg-navy-900",
  ibkrCash: "bg-gray-500",
  inFlight: "bg-gray-200 ring-1 ring-inset ring-gray-500",
};

// T9: invested, cash and in transit, each with its share of the total, and fees on the side.
export function BalanceSplit({ portfolio, locale }: { portfolio: Portfolio; locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const shares = bucketShares(portfolio.buckets);
  const amounts = centsOf(portfolio.buckets);
  const hasMoney = bucketsTotalCents(portfolio.buckets) > 0;

  return (
    <section aria-labelledby="balance-split" className="flex flex-col gap-4">
      <h2 id="balance-split" className="type-heading text-navy-900">
        {t("home.splitLabel")}
      </h2>
      {hasMoney && (
        // The ledger below carries the same numbers as text; the bar is a picture of them.
        <div aria-hidden={true} className="flex h-1.5 gap-px overflow-hidden rounded-full">
          {buckets
            .filter((bucket) => shares[bucket] > 0)
            .map((bucket) => (
              <span
                key={bucket}
                className={swatch[bucket]}
                style={{ width: `${String(shares[bucket] / 100)}%` }}
              />
            ))}
        </div>
      )}
      <Ledger>
        {buckets.map((bucket) => (
          // Not LedgerRow: "En caja en Interactive Brokers" must wrap at 375 px, the value never.
          <div
            key={bucket}
            className="flex items-start justify-between gap-4 border-t border-gray-200 py-3 first:border-t-0"
          >
            <dt className="type-body flex min-w-0 items-baseline gap-2 text-graphite-900">
              <span
                aria-hidden={true}
                className={cx("size-2.5 shrink-0 rounded-full", swatch[bucket])}
              />
              {t(`portfolio.buckets.${bucket}`)}
            </dt>
            <dd className="type-value flex shrink-0 flex-col items-end text-graphite-900">
              <Money cents={amounts[bucket]} locale={locale} />
              {hasMoney && (
                <span className="type-caption whitespace-nowrap text-gray-600 tabular-nums">
                  {t("portfolio.share", { share: formatPercent(shares[bucket] / 10000, locale) })}
                </span>
              )}
            </dd>
          </div>
        ))}
      </Ledger>
      <p className="type-caption text-gray-600">
        {t("portfolio.fees", { amount: formatMoney(portfolio.buckets.feesPaidCents, locale) })}
      </p>
    </section>
  );
}
