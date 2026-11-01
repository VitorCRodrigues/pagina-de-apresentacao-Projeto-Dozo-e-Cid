import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { DepositDetail } from "@/api/proposed-types";
import type { Locale } from "@/api/types";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { formatDate } from "@/lib/dates";
import { paths } from "@/routes";
import { stateLabelKey } from "./deposit-timeline";

interface DepositRowProps {
  deposit: DepositDetail;
  locale: Locale;
  // The history dates each line; the in-progress lists name the rail instead.
  detail: "date" | "rail";
}

// One deposit as a statement line that opens its detail (T8). Use inside a <ul> with hairlines.
export function DepositRow({ deposit, locale, detail }: DepositRowProps) {
  const { t } = useTranslation("deposit");
  return (
    <li className="border-t border-gray-200 first:border-t-0">
      <Link
        to={paths.depositDetail(deposit.id)}
        className="flex min-h-12 items-center gap-3 py-4 hover:bg-paper"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-label text-graphite-900">{t(stateLabelKey(deposit))}</span>
          <span className="type-caption text-gray-600 tabular-nums">
            {detail === "date"
              ? formatDate(deposit.createdAt, locale)
              : t(`deposit.rail.names.${deposit.rail}`)}
          </span>
        </span>
        <Money
          cents={deposit.amountCents}
          locale={locale}
          className="type-value text-graphite-900"
        />
        <Icon icon={ChevronRight} size={16} className="shrink-0 text-gray-600" />
      </Link>
    </li>
  );
}
