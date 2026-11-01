import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { blockMessageKeys } from "@/api/error-messages";
import { useAccount } from "@/api/hooks/account";
import { useConfig } from "@/api/hooks/config";
import { useDeposits } from "@/api/hooks/deposits";
import { usePlans } from "@/api/hooks/plans";
import { usePortfolio } from "@/api/hooks/portfolio";
import type { Account, Locale, Portfolio } from "@/api/types";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { buttonClass } from "@/components/component-styles";
import { Money } from "@/components/Money";
import { ErrorState, InlineError } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { DepositRow } from "@/features/deposits/DepositRow";
import { inProgressStates, newestFirst } from "@/features/deposits/history";
import { accountBlock } from "@/features/deposits/rules";
import { BalanceCard } from "@/features/portfolio/BalanceCard";
import { buckets, centsOf } from "@/features/portfolio/balances";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cx } from "@/lib/cx";
import { asLocale } from "@/lib/locale";
import { SUPPORT_EMAIL } from "@/lib/support";
import { paths } from "@/routes";
import { formatWindowDate, resolveInvestmentWindow } from "./investment-window";

const IN_PROGRESS_SHOWN = 3;
// A text link at the start of a card's column, not stretched across it.
const cardLink = cx(buttonClass("ghost", "never"), "self-start");

// T4. One focus, the total; then what comes next. No returns chart in the pilot.
export function HomeScreen() {
  const { t, i18n } = useTranslation("portfolio");
  const locale = asLocale(i18n.language);

  return (
    <section className="flex flex-col gap-8 py-2">
      <h1 className="type-title text-navy-900">{t("home.title")}</h1>
      <AccountNotes />
      <Total locale={locale} />
      <div className="flex flex-col gap-4">
        <NextDepositCard locale={locale} />
        <InProgressCard locale={locale} />
        <WindowCard locale={locale} />
      </div>
    </section>
  );
}

// --- Pending items and account blocks ---

function AccountNotes() {
  const { data: account } = useAccount();
  if (!account) return null;
  return (
    <>
      <BlockNote account={account} />
      <PendingStrip count={account.pending.length} />
    </>
  );
}

// Decision 14: a restricted account keeps the navigation; the home screen says why deposits stop.
function BlockNote({ account }: { account: Account }) {
  const { t } = useTranslation("portfolio");
  const block = accountBlock(account);
  if (!block) return null;
  const keys = blockMessageKeys(block.reason);
  return (
    <Banner
      tone="warning"
      title={t(keys.message)}
      {...(block.action === "support" && {
        action: (
          <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("ghost", "never")}>
            {t(keys.action)}
          </a>
        ),
      })}
    />
  );
}

function PendingStrip({ count }: { count: number }) {
  const { t } = useTranslation("portfolio");
  if (count === 0) return null;
  return (
    <Banner
      title={t("home.pending", { count })}
      action={
        <Link to={paths.pending} className={buttonClass("ghost", "never")}>
          {t("home.pendingAction")}
        </Link>
      }
    />
  );
}

// --- The total ---

function Total({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const portfolio = usePortfolio();
  if (portfolio.isError) return <ErrorState onRetry={() => void portfolio.refetch()} />;
  if (!portfolio.data) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-36 w-full rounded-card" />
      </div>
    );
  }
  return (
    <BalanceCard
      portfolio={portfolio.data}
      locale={locale}
      note={t("home.updatedAt", { date: formatDateTime(portfolio.data.asOf, locale) })}
    >
      <SplitLine portfolio={portfolio.data} locale={locale} />
    </BalanceCard>
  );
}

// Invertido · En caja · En tránsito, as three statement lines under the total.
function SplitLine({ portfolio, locale }: { portfolio: Portfolio; locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const cents = centsOf(portfolio.buckets);
  return (
    <ul
      aria-label={t("home.splitLabel")}
      className="type-caption border-y border-navy-800 text-cream-50"
    >
      {buckets.map((bucket) => (
        <li
          key={bucket}
          className="flex items-baseline justify-between gap-4 border-t border-navy-800 py-1.5 first:border-t-0"
        >
          <span>{t(`portfolio.bucketsShort.${bucket}`)}</span>
          <Money cents={cents[bucket]} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

// --- Cards ---

function HomeCard({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <Card aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-label text-gray-600">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function CardLoading() {
  const { t } = useTranslation("portfolio");
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

function NextDepositCard({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const plans = usePlans();
  const plan =
    plans.data?.find((p) => p.status === "active") ??
    plans.data?.find((p) => p.status === "paused");

  let body;
  if (plans.isError) body = <InlineError onRetry={() => void plans.refetch()} />;
  else if (!plans.data) body = <CardLoading />;
  else if (!plan) {
    body = (
      <>
        <p className="type-body text-graphite-900">{t("home.nextDeposit.none")}</p>
        <Link to={paths.plan} className={cardLink}>
          {t("home.nextDeposit.create")}
        </Link>
      </>
    );
  } else if (plan.status === "paused") {
    body = (
      <>
        <p className="type-body text-graphite-900">{t("home.nextDeposit.paused")}</p>
        <Link to={paths.plan} className={cardLink}>
          {t("home.nextDeposit.manage")}
        </Link>
      </>
    );
  } else {
    body = (
      <p className="flex items-baseline justify-between gap-4">
        <span className="type-body text-graphite-900">
          {plan.nextRunAt && t("home.nextDeposit.on", { date: formatDate(plan.nextRunAt, locale) })}
        </span>
        <Money cents={plan.amountCents} locale={locale} className="type-value text-graphite-900" />
      </p>
    );
  }
  return <HomeCard title={t("home.nextDeposit.title")}>{body}</HomeCard>;
}

function InProgressCard({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const deposits = useDeposits({ states: inProgressStates });
  const items = newestFirst(deposits.data?.pages.flatMap((page) => page.items) ?? []);
  const hidden = items.length - IN_PROGRESS_SHOWN;

  let body;
  if (deposits.isError) body = <InlineError onRetry={() => void deposits.refetch()} />;
  else if (!deposits.data) body = <CardLoading />;
  else if (items.length === 0) {
    body = (
      <>
        <p className="type-body text-graphite-900">{t("home.inProgress.none")}</p>
        <Link to={paths.newDeposit} className={cardLink}>
          {t("home.inProgress.start")}
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <ul className="-my-1">
          {items.slice(0, IN_PROGRESS_SHOWN).map((deposit) => (
            <DepositRow key={deposit.id} deposit={deposit} locale={locale} detail="rail" />
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-2">
          <span className="type-caption text-gray-600">
            {/* A count only when it is the real one: with more pages, "Ver todos" says enough. */}
            {hidden > 0 && !deposits.hasNextPage && t("home.inProgress.more", { count: hidden })}
          </span>
          <Link to={paths.deposit} className={buttonClass("ghost", "never")}>
            {t("home.inProgress.seeAll")}
          </Link>
        </div>
      </>
    );
  }
  return <HomeCard title={t("home.inProgress.title")}>{body}</HomeCard>;
}

function WindowCard({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const config = useConfig();
  const deposits = useDeposits({ states: inProgressStates });

  let body;
  if (config.isError) body = <InlineError onRetry={() => void config.refetch()} />;
  else if (!config.data || deposits.isPending) body = <CardLoading />;
  else {
    const window = resolveInvestmentWindow({
      config: config.data,
      deposits: deposits.data?.pages.flatMap((page) => page.items) ?? [],
      now: new Date(),
    });
    body = (
      <>
        <p className="type-value text-graphite-900">{formatWindowDate(window, locale)}</p>
        <p className="type-caption text-gray-600">{t("home.window.body")}</p>
      </>
    );
  }
  return <HomeCard title={t("home.window.title")}>{body}</HomeCard>;
}
