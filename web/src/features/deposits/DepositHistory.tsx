import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDeposits } from "@/api/hooks/deposits";
import { Button } from "@/components/Button";
import { buttonClass } from "@/components/component-styles";
import { EmptyState, ErrorState } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { cx } from "@/lib/cx";
import { asLocale } from "@/lib/locale";
import { paths } from "@/routes";
import { DepositRow } from "./DepositRow";
import { type HistoryFilter, historyFilters, newestFirst, statesFor } from "./history";

// T10, inside Aportar under "En curso" (decision 13): finished deposits only, so nothing shows
// twice. The filter lives in component state, never in the URL.
export function DepositHistory() {
  const { t, i18n } = useTranslation("deposit");
  const locale = asLocale(i18n.language);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const deposits = useDeposits({ states: statesFor(filter) });
  const items = newestFirst(deposits.data?.pages.flatMap((page) => page.items) ?? []);

  let body;
  if (deposits.isError) body = <ErrorState onRetry={() => void deposits.refetch()} />;
  else if (!deposits.data) {
    body = (
      <div role="status" className="flex flex-col gap-3 border-y border-gray-200 py-4">
        <span className="sr-only">{t("common.loading")}</span>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  } else if (items.length === 0 && filter === "all") {
    body = (
      <EmptyState
        title={t("deposit.history.empty.title")}
        body={t("deposit.history.empty.body")}
        action={
          <Link to={paths.newDeposit} className={buttonClass("secondary")}>
            {t("deposit.history.empty.action")}
          </Link>
        }
      />
    );
  } else if (items.length === 0 && filter !== "all") {
    body = (
      <div className="flex flex-col items-start gap-2 border-y border-gray-200 py-4">
        <p className="type-body text-gray-600">{t(`deposit.history.emptyFiltered.${filter}`)}</p>
        <Button
          variant="ghost"
          onClick={() => {
            setFilter("all");
          }}
        >
          {t("deposit.history.showAll")}
        </Button>
      </div>
    );
  } else {
    body = (
      <>
        <ul aria-label={t("deposit.history.title")} className="border-y border-gray-200">
          {items.map((deposit) => (
            <DepositRow key={deposit.id} deposit={deposit} locale={locale} detail="date" />
          ))}
        </ul>
        {deposits.hasNextPage && (
          <Button
            variant="secondary"
            disabled={deposits.isFetchingNextPage}
            onClick={() => void deposits.fetchNextPage()}
          >
            {t("deposit.history.more")}
          </Button>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="deposit-history" className="flex flex-col gap-4">
      <h2 id="deposit-history" className="type-heading text-navy-900">
        {t("deposit.history.title")}
      </h2>
      <FilterChips value={filter} onChange={setFilter} />
      {body}
    </section>
  );
}

// Native radios dressed as chips: arrow keys, focus and checked state come from the browser.
function FilterChips({
  value,
  onChange,
}: {
  value: HistoryFilter;
  onChange: (filter: HistoryFilter) => void;
}) {
  const { t } = useTranslation("deposit");
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{t("deposit.history.filterLabel")}</legend>
      {historyFilters.map((filter) => (
        <label key={filter} className="cursor-pointer">
          <input
            type="radio"
            name="deposit-history-filter"
            value={filter}
            checked={value === filter}
            onChange={() => {
              onChange(filter);
            }}
            className="peer sr-only"
          />
          <span
            className={cx(
              "type-caption inline-flex min-h-11 items-center rounded-full border px-4",
              "transition-colors duration-fast motion-reduce:transition-none",
              "border-gray-200 text-graphite-900 hover:border-navy-900",
              "peer-checked:border-navy-900 peer-checked:bg-navy-900 peer-checked:text-cream-50",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-900",
            )}
          >
            {t(`deposit.history.filters.${filter}`)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
