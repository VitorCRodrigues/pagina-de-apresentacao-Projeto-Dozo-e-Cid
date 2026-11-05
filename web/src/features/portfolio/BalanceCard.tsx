import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, Portfolio } from "@/api/types";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { Skeleton } from "@/components/Skeleton";
import { formatMoney } from "@/lib/money";
import { reportIssue } from "@/lib/report";
import { bucketsTotalCents } from "./balances";

interface BalanceCardProps {
  portfolio: Portfolio;
  locale: Locale;
  // When the values were last reconciled, worded for the screen (T4 short, T9 explained).
  note: ReactNode;
  children?: ReactNode;
}

// The one headline figure of T4 and T9: the total in Inter Display, cream on navy; gold is
// left only on the "Total" label (decisions.md, 03/11).
// The total is the sum of the buckets shown below it, so the lines always add up on screen.
export function BalanceCard({ portfolio, locale, note, children }: BalanceCardProps) {
  const { t } = useTranslation("portfolio");
  const totalCents = bucketsTotalCents(portfolio.buckets);
  const mismatch = totalCents !== portfolio.totalCents;

  useEffect(() => {
    // TODO(decisão): api-gaps.md, item 8. The API total should equal the buckets (decision 15);
    // until the contract is confirmed, the screen trusts the buckets and monitoring hears of it.
    if (mismatch) reportIssue("portfolio_total_mismatch", portfolio.asOf);
  }, [mismatch, portfolio.asOf]);

  return (
    <Card tone="inverse" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {totalCents <= 0 ? (
          // Nothing to mark (no balance yet, or cash owed for a fee): the gold label and the
          // display figure wait until there is a balance.
          <>
            <p className="type-label text-cream-50">{t("portfolio.total")}</p>
            <p className="type-value-lg text-cream-50">{formatMoney(totalCents, locale)}</p>
          </>
        ) : (
          <>
            <p className="type-label text-gold-500">{t("portfolio.total")}</p>
            <Money cents={totalCents} locale={locale} size="display" className="text-cream-50" />
          </>
        )}
      </div>
      {children}
      <p className="type-caption text-cream-50">{note}</p>
    </Card>
  );
}

// The card before the portfolio arrives: the same type styles, so each line already has its
// final height and the sections below do not move when the figures come in (CLS). `split`: the
// three statement lines Início shows inside the card.
export function BalanceCardSkeleton({ split = false }: { split?: boolean }) {
  const bar = "inline-block align-middle bg-navy-800";
  return (
    <Card tone="inverse" className="flex flex-col gap-4" data-skeleton="balance">
      <div className="flex flex-col gap-1">
        <div className="type-label">
          <Skeleton className={`${bar} h-3 w-12`} />
        </div>
        <div className="type-value-display">
          <Skeleton className={`${bar} h-9 w-48`} />
        </div>
      </div>
      {split && (
        <ul className="type-caption border-y border-navy-800">
          {[0, 1, 2].map((line) => (
            <li key={line} className="border-t border-navy-800 py-1.5 first:border-t-0">
              <Skeleton className={`${bar} h-3 w-full`} />
            </li>
          ))}
        </ul>
      )}
      <div className="type-caption">
        <Skeleton className={`${bar} h-3 w-2/3`} />
      </div>
    </Card>
  );
}
