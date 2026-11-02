import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useTermsDocuments } from "@/api/hooks/account";
import type { Locale } from "@/api/types";
import { Banner } from "@/components/Banner";
import { buttonClass } from "@/components/component-styles";
import { InlineError, InlineLoading } from "@/components/PageState";
import { formatDate } from "@/lib/dates";
import { cx } from "@/lib/cx";
import { paths } from "@/routes";
import { ProfileSection, sectionBlock } from "./ProfileSection";
import { acceptedTermsRows, pendingTerms } from "./terms-history";

// What the client accepted, version by version, and what still waits. The acceptance itself
// happens in Pendientes (T11). TODO(decisão): documents the client sent (KYC) have no list route.
export function TermsSection({ locale }: { locale: Locale }) {
  const { t } = useTranslation("profile");
  const terms = useTermsDocuments();

  let body;
  if (terms.data) {
    const rows = acceptedTermsRows(terms.data);
    const pending = pendingTerms(terms.data);
    body = (
      <>
        {/* What needs the client comes before the record of what is done. */}
        {pending.length > 0 && (
          <Banner
            title={pending.map((doc) => (
              <span key={doc.id} className="block">
                {t("profile.terms.pending", { title: doc.title, version: doc.version })}
              </span>
            ))}
            quiet
            action={
              <Link to={paths.pending} className={cx(buttonClass("ghost", "never"), "-ml-1")}>
                {t("profile.terms.pendingAction")}
              </Link>
            }
          />
        )}
        {rows.length > 0 && (
          <ul className="border-y border-gray-200">
            {rows.map((row) => (
              <li
                key={`${row.id}-${row.version}`}
                className="flex flex-col gap-1 border-t border-gray-200 py-3 first:border-t-0"
              >
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-body self-start text-graphite-900 underline decoration-gray-500 underline-offset-4"
                >
                  {row.title}
                </a>
                <span className="type-caption flex flex-wrap justify-between gap-x-4 text-gray-600 tabular-nums">
                  <span>{t("profile.terms.version", { version: row.version })}</span>
                  <span>
                    {t("profile.terms.acceptedOn", { date: formatDate(row.acceptedAt, locale) })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {rows.length === 0 && pending.length === 0 && (
          <p className="type-body border-y border-gray-200 py-4 text-gray-600">
            {t("profile.terms.none")}
          </p>
        )}
      </>
    );
  } else if (terms.isError) {
    body = (
      <div className={sectionBlock}>
        <InlineError onRetry={() => void terms.refetch()} />
      </div>
    );
  } else {
    body = (
      <div className={sectionBlock}>
        <InlineLoading />
      </div>
    );
  }

  return <ProfileSection title={t("profile.terms.title")}>{body}</ProfileSection>;
}
