import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/api/types";
import { formatTime } from "@/lib/dates";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

interface StateLayoutProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  // "heading" when the state sits under the screen's own h1, so the two never compete.
  titleSize?: "title" | "heading";
}

// Typographic, like a statement section: a graphite rule, the title, one sentence, one action.
// No icon. No side padding: they sit inside AppShell, which owns the page margins.
function StateLayout({ title, body, action, titleSize = "title" }: StateLayoutProps) {
  // "title": a whole page (not found, session expired, maintenance), so its h1. "heading": a
  // state inside a screen that already has one.
  const Heading = titleSize === "title" ? "h1" : "h2";
  return (
    // No top margin of its own: the screen's gap already separates it from the h1, as it does
    // for every other block, so empty and error states keep the loaded screen's rhythm.
    <section className="flex flex-col items-start gap-3 border-t border-graphite-900 pt-5">
      <Heading
        className={
          titleSize === "title" ? "type-title text-navy-900" : "type-heading text-navy-900"
        }
      >
        {title}
      </Heading>
      {body && <p className="type-body max-w-prose text-gray-600">{body}</p>}
      {action && <div className="mt-3 w-full sm:w-auto">{action}</div>}
    </section>
  );
}

// The placeholder takes the shape of the screen that is loading, so its blocks sit where the
// content will (no jump when it arrives). "statement": sections of lines between hairlines
// (Plan, Pendientes, Ayuda); "form": a field and its action (new deposit, onboarding);
// "timeline": a heading and steps (deposit detail, account status). Static, no pulse.
export type LoadingShape = "statement" | "form" | "timeline";

export function LoadingState({ shape = "statement" }: { shape?: LoadingShape }) {
  const { t } = useTranslation();
  return (
    <div role="status" data-skeleton={shape} className="flex flex-col gap-8 py-2">
      <span className="sr-only">{t("states.loading")}</span>
      {shape === "statement" &&
        [0, 1].map((section) => (
          <div key={section} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <div className="flex flex-col border-y border-gray-200">
              {[0, 1, 2].map((line) => (
                <div
                  key={line}
                  className="flex justify-between gap-4 border-t border-gray-200 py-4 first:border-t-0"
                >
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      {shape === "form" && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {shape === "timeline" && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-2/3" />
          {[0, 1, 2, 3].map((step) => (
            <div key={step} className="flex gap-4">
              <Skeleton className="size-5 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  // Always inside a screen that has its own h1.
  return <StateLayout title={title} body={body} action={action} titleSize="heading" />;
}

// `page`: the error is all there is on screen (the session could not load), so it is the h1.
export function ErrorState({ onRetry, page = false }: { onRetry: () => void; page?: boolean }) {
  const { t } = useTranslation();
  return (
    <StateLayout
      titleSize={page ? "title" : "heading"}
      title={t("states.error.title")}
      body={t("states.error.body")}
      action={<Button onClick={onRetry}>{t("common.retry")}</Button>}
    />
  );
}

// For one part of a screen that is still loading while the rest is already there.
export function InlineLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

// For one part of a screen (a card, a link) that failed while the rest stays useful.
export function InlineError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="type-body text-graphite-900">{t("states.error.title")}</p>
      {/* -ml-1: the ghost button's own padding, so its text lines up with the sentence above. */}
      <Button variant="ghost" fullWidth="never" className="-ml-1" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}

export function NotFoundState({ onHome }: { onHome: () => void }) {
  const { t } = useTranslation();
  return (
    <StateLayout
      title={t("notFound.title")}
      body={t("notFound.body")}
      action={<Button onClick={onHome}>{t("notFound.action")}</Button>}
    />
  );
}

export function SessionExpired({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  return (
    <StateLayout
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
