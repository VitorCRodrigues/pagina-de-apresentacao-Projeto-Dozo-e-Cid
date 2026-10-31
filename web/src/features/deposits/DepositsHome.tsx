import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDeposits } from "@/api/hooks/deposits";
import type { DepositState } from "@/api/types";
import { buttonClass } from "@/components/component-styles";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { asLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { paths } from "@/routes";

const finished: readonly DepositState[] = ["invested", "returned"];

// The Aportar tab: one way to start a deposit and the ones still moving.
// TODO(decisão): the full history (T10) lands here in phase 7.
export function DepositsHome() {
  const { t, i18n } = useTranslation("deposit");
  const locale = asLocale(i18n.language);
  const deposits = useDeposits();
  const inProgress = (deposits.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (deposit) => !finished.includes(deposit.state),
  );

  return (
    <section className="flex flex-col gap-8 py-2">
      <header className="flex flex-col gap-5">
        <h1 className="type-title text-navy-900">{t("deposit.title")}</h1>
        <Link to={paths.newDeposit} className={buttonClass("primary")}>
          {t("deposit.home.new")}
        </Link>
      </header>

      <section aria-labelledby="in-progress" className="flex flex-col gap-3">
        <h2 id="in-progress" className="type-heading text-navy-900">
          {t("deposit.home.inProgress")}
        </h2>
        {deposits.isError ? (
          <ErrorState onRetry={() => void deposits.refetch()} />
        ) : deposits.isPending ? (
          <div className="flex flex-col gap-3 border-y border-gray-200 py-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : inProgress.length === 0 ? (
          <p className="type-body border-y border-gray-200 py-4 text-gray-600">
            {t("deposit.home.none")}
          </p>
        ) : (
          <ul aria-label={t("deposit.home.inProgress")} className="border-y border-gray-200">
            {inProgress.map((deposit) => (
              <li key={deposit.id} className="border-t border-gray-200 first:border-t-0">
                <Link
                  to={paths.depositDetail(deposit.id)}
                  className="flex items-center gap-3 py-4 hover:bg-paper"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="type-label text-graphite-900">
                      {t(`deposit.state.${deposit.state}`)}
                    </span>
                    <span className="type-caption text-gray-600">
                      {t(`deposit.rail.names.${deposit.rail}`)}
                    </span>
                  </span>
                  <span className="type-value text-graphite-900">
                    {formatMoney(deposit.amountCents, locale)}
                  </span>
                  <Icon icon={ChevronRight} size={16} className="shrink-0 text-gray-600" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="type-caption text-gray-600">{t("deposit.home.historyLater")}</p>
      </section>
    </section>
  );
}
