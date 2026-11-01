import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDeposits } from "@/api/hooks/deposits";
import { Button } from "@/components/Button";
import { buttonClass } from "@/components/component-styles";
import { ErrorState } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { asLocale } from "@/lib/locale";
import { paths } from "@/routes";
import { DepositHistory } from "./DepositHistory";
import { DepositRow } from "./DepositRow";
import { inProgressStates, newestFirst } from "./history";

// The Aportar tab: one way to start a deposit, the ones still moving and, below, the finished
// ones (T10). The API filters each section, so no deposit appears twice.
export function DepositsHome() {
  const { t, i18n } = useTranslation("deposit");
  const locale = asLocale(i18n.language);
  const deposits = useDeposits({ states: inProgressStates });
  const inProgress = newestFirst(deposits.data?.pages.flatMap((page) => page.items) ?? []);

  return (
    <section className="flex flex-col gap-10 py-2">
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
              <DepositRow key={deposit.id} deposit={deposit} locale={locale} detail="rail" />
            ))}
          </ul>
        )}
        {deposits.hasNextPage && (
          <Button
            variant="secondary"
            disabled={deposits.isFetchingNextPage}
            onClick={() => void deposits.fetchNextPage()}
          >
            {t("deposit.history.more")}
          </Button>
        )}
      </section>

      <DepositHistory />
    </section>
  );
}
