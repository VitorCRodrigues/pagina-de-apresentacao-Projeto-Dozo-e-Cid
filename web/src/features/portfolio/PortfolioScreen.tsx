import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useConfig } from "@/api/hooks/config";
import { useDeposits } from "@/api/hooks/deposits";
import { usePortfolio } from "@/api/hooks/portfolio";
import type { ProposedConfig } from "@/api/proposed-types";
import type { Locale, Portfolio } from "@/api/types";
import { buttonClass } from "@/components/component-styles";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, InlineError, LoadingState } from "@/components/PageState";
import { RiskNote } from "@/components/RiskNote";
import { Skeleton } from "@/components/Skeleton";
import { inProgressStates } from "@/features/deposits/history";
import { formatWindowDate, resolveInvestmentWindow } from "@/features/home/investment-window";
import { formatDateTime } from "@/lib/dates";
import { asLocale } from "@/lib/locale";
import { paths } from "@/routes";
import { BalanceCard } from "./BalanceCard";
import { bucketsTotalCents } from "./balances";
import { BalanceSplit } from "./BalanceSplit";
import { PositionList } from "./PositionList";

// T9. Values come from the daily IBKR reconciliation, never real time; no returns are shown.
export function PortfolioScreen() {
  const { t, i18n } = useTranslation("portfolio");
  const locale = asLocale(i18n.language);
  const portfolio = usePortfolio();

  let body;
  if (portfolio.isError) {
    body = <ErrorState onRetry={() => void portfolio.refetch()} />;
  } else if (!portfolio.data) {
    body = <LoadingState />;
  } else if (
    bucketsTotalCents(portfolio.data.buckets) === 0 &&
    portfolio.data.positions.length === 0
  ) {
    body = (
      <>
        <EmptyState
          title={t("portfolio.empty.title")}
          body={t("portfolio.empty.body")}
          action={
            <Link to={paths.newDeposit} className={buttonClass("primary")}>
              {t("portfolio.empty.action")}
            </Link>
          }
        />
        <RiskNote />
      </>
    );
  } else {
    body = <PortfolioView portfolio={portfolio.data} locale={locale} />;
  }

  return (
    <section className="flex flex-col gap-8 py-2">
      <h1 className="type-title text-navy-900">{t("portfolio.title")}</h1>
      {body}
    </section>
  );
}

// GET /config only feeds the statements link and the window date, so the portfolio never waits
// on it (the session guard has usually loaded it already; a failed refetch keeps the cached one).
function PortfolioView({ portfolio, locale }: { portfolio: Portfolio; locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const config = useConfig();
  // TODO(compliance): wording of the reconciliation note pending legal review.
  const asOf = t("portfolio.asOf", { date: formatDateTime(portfolio.asOf, locale) });

  return (
    <>
      <BalanceCard portfolio={portfolio} locale={locale} note={asOf} />
      <BalanceSplit portfolio={portfolio} locale={locale} />

      <section aria-labelledby="positions" className="flex flex-col gap-4">
        <h2 id="positions" className="type-heading text-navy-900">
          {t("portfolio.positions.title")}
        </h2>
        {portfolio.positions.length > 0 ? (
          <PositionList positions={portfolio.positions} locale={locale} />
        ) : (
          <WaitingNote config={config.data} locale={locale} />
        )}
      </section>

      <footer className="flex flex-col gap-5">
        {config.data ? (
          <a
            href={config.data.ibkrPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("secondary")}
          >
            {t("portfolio.statements")}
            <span className="sr-only"> {t("portfolio.newTab")}</span>
            <Icon icon={ExternalLink} size={16} />
          </a>
        ) : config.isError ? (
          <InlineError onRetry={() => void config.refetch()} />
        ) : (
          <Skeleton className="h-12 w-full rounded-control" />
        )}
        <RiskNote />
      </footer>
    </>
  );
}

// Money in transit or in cash, nothing bought yet: say when it gets invested. Waits for the
// deposits, whose server date beats the local calculation; if they fail, the local one stays.
function WaitingNote({ config, locale }: { config: ProposedConfig | undefined; locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const deposits = useDeposits({ states: inProgressStates });
  if (!config || deposits.isPending) {
    return <Skeleton className="h-12 w-full" />;
  }
  const window = resolveInvestmentWindow({
    config,
    deposits: deposits.data?.pages.flatMap((page) => page.items) ?? [],
    now: new Date(),
  });
  return (
    <p className="type-body border-y border-gray-200 py-4 text-graphite-900">
      {t("portfolio.waiting", { date: formatWindowDate(window, locale) })}
    </p>
  );
}
