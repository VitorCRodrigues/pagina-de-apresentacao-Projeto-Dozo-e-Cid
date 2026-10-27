import { Clock, Inbox, Wrench, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/api/types";
import { formatTime } from "@/lib/dates";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";

interface StateLayoutProps {
  icon: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}

// Left aligned like the rest of the statement; the page states direct, they do not decorate.
function StateLayout({ icon, title, body, action }: StateLayoutProps) {
  return (
    <section className="flex flex-col items-start gap-3 px-5 py-12">
      <Icon icon={icon} size={24} className="text-gray-600" />
      <h2 className="type-title text-navy-900">{title}</h2>
      {body && <p className="type-body max-w-prose text-gray-600">{body}</p>}
      {action && <div className="mt-3 w-full sm:w-auto">{action}</div>}
    </section>
  );
}

export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col gap-4 px-5 py-8">
      <span className="sr-only">{t("states.loading")}</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-48" />
      <Skeleton className="mt-4 h-40 w-full rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return <StateLayout icon={Inbox} title={title} body={body} action={action} />;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <StateLayout
      icon={WifiOff}
      title={t("states.error.title")}
      body={t("states.error.body")}
      action={<Button onClick={onRetry}>{t("common.retry")}</Button>}
    />
  );
}

export function SessionExpired({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  return (
    <StateLayout
      icon={Clock}
      title={t("states.sessionExpired.title")}
      body={t("states.sessionExpired.body")}
      action={<Button onClick={onSignIn}>{t("states.sessionExpired.action")}</Button>}
    />
  );
}

interface MaintenanceProps {
  locale: Locale;
  // ISO 8601 UTC, when known.
  until?: string;
}

export function Maintenance({ locale, until }: MaintenanceProps) {
  const { t } = useTranslation();
  const time = until && formatTime(until, locale);

  return (
    <StateLayout
      icon={Wrench}
      title={t("states.maintenance.title")}
      body={
        <>
          {t("states.maintenance.body")}
          {time && <> {t("states.maintenance.until", { time })}</>}
        </>
      }
    />
  );
}
