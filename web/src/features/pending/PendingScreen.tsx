import { useTranslation } from "react-i18next";
import { useNotifications } from "@/api/hooks/account";
import type { Locale } from "@/api/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/PageState";
import type { Notification } from "@/api/proposed-types";
import { formatDate } from "@/lib/dates";
import { asLocale } from "@/lib/locale";
import { cx } from "@/lib/cx";
import { groupPending, isOverdue, type PendingGroup } from "./pending-order";
import { PendingItemAction } from "./PendingItemAction";

// T11. What needs the client, grouped money first, each item with one action and its deadline.
// Titles and descriptions come translated from the API (decision 12).
export function PendingScreen() {
  const { t, i18n } = useTranslation("pending");
  const locale = asLocale(i18n.language);
  const notifications = useNotifications();

  let body;
  if (notifications.isError) {
    body = <ErrorState onRetry={() => void notifications.refetch()} />;
  } else if (!notifications.data) {
    body = <LoadingState />;
  } else {
    const groups = groupPending(notifications.data);
    body =
      groups.length === 0 ? (
        <EmptyState title={t("pending.empty.title")} body={t("pending.empty.body")} />
      ) : (
        groups.map((group) => <Group key={group.kind} group={group} locale={locale} />)
      );
  }

  return (
    <section className="flex flex-col gap-10 py-2">
      <h1 className="type-title text-navy-900">{t("pending.title")}</h1>
      {body}
    </section>
  );
}

function Group({ group, locale }: { group: PendingGroup; locale: Locale }) {
  const { t } = useTranslation("pending");
  const id = `pending-${group.kind}`;
  const title = t(`pending.groups.${group.kind}`);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading text-navy-900">
        {title}
      </h2>
      <ul aria-label={title} className="border-y border-gray-200">
        {group.items.map((item) => (
          <PendingRow key={item.id} item={item} locale={locale} />
        ))}
      </ul>
    </section>
  );
}

function PendingRow({ item, locale }: { item: Notification; locale: Locale }) {
  const { t } = useTranslation("pending");
  const overdue = isOverdue(item, new Date());
  return (
    <li className="flex flex-col items-start gap-1 border-t border-gray-200 py-4 first:border-t-0">
      <h3 className="type-label text-graphite-900">{item.title}</h3>
      <p className="type-caption max-w-prose text-gray-600">{item.description}</p>
      {item.dueAt && (
        // An overdue deadline is a warning (amber), never a loss colour.
        <p
          className={cx("type-caption tabular-nums", overdue ? "text-amber-700" : "text-gray-600")}
        >
          {t(overdue ? "pending.overdue" : "pending.due", { date: formatDate(item.dueAt, locale) })}
        </p>
      )}
      <div className="-ml-1 pt-1">
        <PendingItemAction item={item} />
      </div>
    </li>
  );
}
