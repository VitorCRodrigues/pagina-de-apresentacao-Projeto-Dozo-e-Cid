import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { isApiError } from "@/api/errors";
import { useMe } from "@/api/hooks/account";
import { useDeposit } from "@/api/hooks/deposits";
import type { DepositDetail } from "@/api/proposed-types";
import type { Locale } from "@/api/types";
import { Banner } from "@/components/Banner";
import { buttonClass } from "@/components/component-styles";
import { Ledger, LedgerRow } from "@/components/Ledger";
import { ErrorState, LoadingState } from "@/components/PageState";
import { Timeline } from "@/components/Timeline";
import { formatDate } from "@/lib/dates";
import { asLocale } from "@/lib/locale";
import { formatMoney, sumCents } from "@/lib/money";
import { SUPPORT_EMAIL } from "@/lib/support";
import { paths } from "@/routes";
import { depositTimeline } from "./deposit-timeline";
import { SentNotice } from "./instructions/SentNotice";
import { UsdcInstructions } from "./instructions/UsdcInstructions";
import { WireInstructions } from "./instructions/WireInstructions";

// T8. The deposit's own statement: what the client has to do (if anything), where the money
// is, and the amounts. Polls every 30 s until invested or returned (useDeposit).
export function DepositDetailScreen() {
  const { t } = useTranslation("deposit");
  const { id = "" } = useParams();
  const deposit = useDeposit(id);

  if (isApiError(deposit.error) && deposit.error.code === "not_found") {
    return (
      <section className="flex flex-col gap-6 py-2">
        <h1 className="type-title text-navy-900">{t("deposit.detail.notFound")}</h1>
        <Link to={paths.deposit} className={buttonClass("secondary")}>
          {t("deposit.title")}
        </Link>
      </section>
    );
  }
  if (deposit.isError) return <ErrorState onRetry={() => void deposit.refetch()} />;
  if (!deposit.data) return <LoadingState />;
  return <DepositDetailView deposit={deposit.data} checkedAt={deposit.dataUpdatedAt} />;
}

function SupportLink() {
  const { t } = useTranslation("deposit");
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("ghost", "never")}>
      {t("deposit.actions.support")}
    </a>
  );
}

// checkedAt is when the deposit was last fetched: each 30 s poll re-checks expectedBy.
function DepositDetailView({ deposit, checkedAt }: { deposit: DepositDetail; checkedAt: number }) {
  const { t, i18n } = useTranslation("deposit");
  const locale = asLocale(i18n.language);
  const { data: me } = useMe();

  // No deposit instructions unless the account is open (PRD section 5, failure B2).
  const accountOpen = me?.accountStatus === "open";
  const waitingForClient = deposit.state === "deposit_notified";
  const finished = deposit.state === "invested" || deposit.state === "returned";
  const overdue =
    !finished && deposit.expectedBy !== undefined && Date.parse(deposit.expectedBy) < checkedAt;

  return (
    <article className="flex flex-col gap-8 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="type-title text-navy-900">
          {t("deposit.detail.title", { amount: formatMoney(deposit.amountCents, locale) })}
        </h1>
        <p className="type-body text-gray-600">{t(`deposit.rail.names.${deposit.rail}`)}</p>
      </header>

      {deposit.blockReason === "pix_med_hold" && (
        <Banner tone="warning" title={t("deposit.detail.hold")}>
          {deposit.expectedBy &&
            t("deposit.detail.holdBody", { date: formatDate(deposit.expectedBy, locale) })}
        </Banner>
      )}

      {waitingForClient &&
        (accountOpen && deposit.instructions ? (
          <section aria-labelledby="instructions" className="flex flex-col gap-6">
            <h2 id="instructions" className="type-heading text-navy-900">
              {t("deposit.instructions.title")}
            </h2>
            {deposit.instructions.type === "usdc" ? (
              <UsdcInstructions deposit={deposit} instructions={deposit.instructions} />
            ) : (
              <WireInstructions deposit={deposit} instructions={deposit.instructions} />
            )}
            <SentNotice depositId={deposit.id} />
          </section>
        ) : (
          <Banner tone="warning" title={t("deposit.detail.blocked")} action={<SupportLink />} />
        ))}

      {deposit.state === "broker_credited" && deposit.nextInvestmentWindow && (
        <Banner
          tone="info"
          title={t("deposit.detail.window", {
            date: formatDate(deposit.nextInvestmentWindow, locale),
          })}
        />
      )}

      {overdue && (
        <Banner tone="info" title={t("deposit.detail.overdue")} action={<SupportLink />}>
          {t("deposit.detail.overdueBody")}
        </Banner>
      )}

      {deposit.state === "returned" && (
        <Banner tone="error" title={t("deposit.detail.returned")} action={<SupportLink />}>
          <span className="flex flex-col gap-1">
            {deposit.returnReason && <span>{deposit.returnReason}</span>}
            {/* TODO(compliance): refund policy depends on the partner contract. */}
            <span>{t("deposit.detail.refund")}</span>
          </span>
        </Banner>
      )}

      <Timeline
        label={t("deposit.detail.timeline")}
        locale={locale}
        steps={depositTimeline(deposit).map((step) => ({
          id: step.state,
          label: t(step.labelKey),
          status: step.status,
          ...(step.at && { at: step.at }),
        }))}
      />

      <Values deposit={deposit} locale={locale} />
    </article>
  );
}

function Values({ deposit, locale }: { deposit: DepositDetail; locale: Locale }) {
  const { t } = useTranslation("deposit");
  const costs = sumCents(deposit.costs.map((line) => line.amountCents));
  return (
    <section aria-labelledby="values" className="flex flex-col gap-3">
      <h2 id="values" className="type-heading text-navy-900">
        {t("deposit.detail.values")}
      </h2>
      <Ledger>
        <LedgerRow label={t("deposit.detail.sent")}>
          {formatMoney(deposit.amountCents, locale)}
        </LedgerRow>
        <LedgerRow label={t("deposit.detail.costs")}>{formatMoney(costs, locale)}</LedgerRow>
        {deposit.creditedCents !== undefined && (
          <LedgerRow label={t("deposit.detail.credited")}>
            {formatMoney(deposit.creditedCents, locale)}
          </LedgerRow>
        )}
        {deposit.investedCents !== undefined && (
          <LedgerRow label={t("deposit.detail.invested")}>
            {formatMoney(deposit.investedCents, locale)}
          </LedgerRow>
        )}
        {deposit.quote?.rateDescription && (
          <LedgerRow label={t("deposit.detail.quote")}>{deposit.quote.rateDescription}</LedgerRow>
        )}
      </Ledger>
    </section>
  );
}
