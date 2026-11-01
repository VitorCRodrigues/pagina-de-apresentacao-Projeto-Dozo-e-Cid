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
import { buttonClass } from "@/components/component-styles";
import { Money } from "@/components/Money";
import { ErrorState, InlineError } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { DepositRow } from "@/features/deposits/DepositRow";
import { inProgressStates, newestFirst } from "@/features/deposits/history";
import { accountBlock } from "@/features/deposits/rules";
import { BalanceCard } from "@/features/portfolio/BalanceCard";
import { buckets, bucketsTotalCents, centsOf } from "@/features/portfolio/balances";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cx } from "@/lib/cx";
import { asLocale } from "@/lib/locale";
import { SUPPORT_EMAIL } from "@/lib/support";
import { paths } from "@/routes";
import { currentPlan } from "@/features/plans/plan-rules";
import { formatWindowDate, resolveInvestmentWindow } from "./investment-window";

const IN_PROGRESS_SHOWN = 3;
// A text link at the start of a section's column, not stretched across it.
const sectionLink = cx(buttonClass("ghost", "never"), "-ml-1 self-start");

// T4. One focus, the total on navy; everything after it is a quiet statement on the page, in
// the same sections and hairlines as Aportar and Cartera. No returns chart in the pilot.
export function HomeScreen() {
  const { t, i18n } = useTranslation("portfolio");
  const locale = asLocale(i18n.language);
  const portfolio = usePortfolio();
  // A new client: nothing anywhere yet, so the screen's one action is the first deposit.
  const isNew = portfolio.data !== undefined && bucketsTotalCents(portfolio.data.buckets) === 0;

  return (
    <section className="flex flex-col gap-10 py-2">
      <div className="flex flex-col gap-8">
        <h1 className="type-title text-navy-900">{t("home.title")}</h1>
        <AccountNotes />
        <Total locale={locale} />
        {isNew && (
          <Link to={paths.newDeposit} className={buttonClass("primary")}>
            {t("portfolio.empty.action")}
          </Link>
        )}
      </div>
      <NextDepositSection locale={locale} />
      <InProgressSection locale={locale} offerStart={!isNew} />
      <WindowSection locale={locale} />
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

// --- What comes next ---

// A titled block of the statement: heading, then its lines between hairlines.
function HomeSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading text-navy-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

const statementBlock = "flex flex-col gap-2 border-y border-gray-200 py-4";

function SectionLoading() {
  const { t } = useTranslation("portfolio");
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

function NextDepositSection({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const plans = usePlans();
  // The same plan the plan screen (T5) shows.
  const plan = plans.data ? currentPlan(plans.data) : undefined;

  let body;
  if (plans.isError) body = <InlineError onRetry={() => void plans.refetch()} />;
  else if (!plans.data) body = <SectionLoading />;
  else if (!plan || plan.status === "paused") {
    body = (
      <div className={statementBlock}>
        <p className="type-body text-gray-600">
          {plan ? t("home.nextDeposit.paused") : t("home.nextDeposit.none")}
        </p>
        <Link to={paths.plan} className={sectionLink}>
          {plan ? t("home.nextDeposit.manage") : t("home.nextDeposit.create")}
        </Link>
      </div>
    );
  } else {
    body = (
      // The only way to the plan (T5) once it is active: it has no tab of its own.
      <div className={statementBlock}>
        <p className="flex items-baseline justify-between gap-4">
          <span className="type-body text-graphite-900">
            {plan.nextRunAt &&
              t("home.nextDeposit.on", { date: formatDate(plan.nextRunAt, locale) })}
          </span>
          <Money
            cents={plan.amountCents}
            locale={locale}
            className="type-value text-graphite-900"
          />
        </p>
        <Link to={paths.plan} className={sectionLink}>
          {t("home.nextDeposit.manage")}
        </Link>
      </div>
    );
  }
  return <HomeSection title={t("home.nextDeposit.title")}>{body}</HomeSection>;
}

// `offerStart`: a link to start one when none is moving; off for a new client, whose primary
// button under the total already says it.
function InProgressSection({ locale, offerStart }: { locale: Locale; offerStart: boolean }) {
  const { t } = useTranslation("portfolio");
  const deposits = useDeposits({ states: inProgressStates });
  const items = newestFirst(deposits.data?.pages.flatMap((page) => page.items) ?? []);
  const hidden = items.length - IN_PROGRESS_SHOWN;

  let body;
  if (deposits.isError) body = <InlineError onRetry={() => void deposits.refetch()} />;
  else if (!deposits.data) body = <SectionLoading />;
  else if (items.length === 0) {
    body = (
      <div className={statementBlock}>
        <p className="type-body text-gray-600">{t("home.inProgress.none")}</p>
        {offerStart && (
          <Link to={paths.newDeposit} className={sectionLink}>
            {t("home.inProgress.start")}
          </Link>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <ul className="border-y border-gray-200">
          {items.slice(0, IN_PROGRESS_SHOWN).map((deposit) => (
            <DepositRow key={deposit.id} deposit={deposit} locale={locale} detail="rail" />
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4">
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
  return <HomeSection title={t("home.inProgress.title")}>{body}</HomeSection>;
}

function WindowSection({ locale }: { locale: Locale }) {
  const { t } = useTranslation("portfolio");
  const config = useConfig();
  const deposits = useDeposits({ states: inProgressStates });

  let body;
  if (config.isError) body = <InlineError onRetry={() => void config.refetch()} />;
  else if (!config.data || deposits.isPending) body = <SectionLoading />;
  else {
    const window = resolveInvestmentWindow({
      config: config.data,
      deposits: deposits.data?.pages.flatMap((page) => page.items) ?? [],
      now: new Date(),
    });
    body = (
      <div className={statementBlock}>
        <p className="type-value text-graphite-900">{formatWindowDate(window, locale)}</p>
        <p className="type-caption max-w-prose text-gray-600">{t("home.window.body")}</p>
      </div>
    );
  }
  return <HomeSection title={t("home.window.title")}>{body}</HomeSection>;
}
