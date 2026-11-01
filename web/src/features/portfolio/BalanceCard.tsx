import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, Portfolio } from "@/api/types";
import { Card } from "@/components/Card";
import { Money } from "@/components/Money";
import { reportIssue } from "@/lib/report";
import { bucketsTotalCents } from "./balances";

interface BalanceCardProps {
  portfolio: Portfolio;
  locale: Locale;
  // When the values were last reconciled, worded for the screen (T4 short, T9 explained).
  note: ReactNode;
  children?: ReactNode;
}

// The one headline figure of T4 and T9: the total in Fraunces, gold on navy (decisions.md, 10).
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
        <p className="type-label text-cream-50">{t("portfolio.total")}</p>
        <Money cents={totalCents} locale={locale} size="display" className="text-gold-500" />
      </div>
      {children}
      <p className="type-caption text-cream-50">{note}</p>
    </Card>
  );
}
