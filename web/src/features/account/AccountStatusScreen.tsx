import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAccount, useMe, useUploadDocument } from "@/api/hooks/account";
import { queryKeys } from "@/api/query-keys";
import type { Account, AccountStatus } from "@/api/types";
import { buttonClass } from "@/components/component-styles";
import { Ledger, LedgerRow } from "@/components/Ledger";
import { ErrorState, LoadingState } from "@/components/PageState";
import { Timeline } from "@/components/Timeline";
import { asLocale } from "@/lib/locale";
import { SUPPORT_EMAIL } from "@/lib/support";
import { paths } from "@/routes";
import { accountTimeline } from "./account-timeline";
import { DocumentUpload } from "./DocumentUpload";

// Statuses that wait on us or on Interactive Brokers: the screen checks back on its own.
const waiting: readonly AccountStatus[] = [
  "submitted",
  "kyc_review",
  "ibkr_pending",
  "action_required",
];

const bodyKey = {
  draft: "account.body.draft",
  submitted: "account.body.waiting",
  kyc_review: "account.body.waiting",
  ibkr_pending: "account.body.waiting",
  action_required: "account.body.action_required",
  open: "account.body.open",
  rejected: "account.body.rejected",
  restricted: "account.body.restricted",
} as const satisfies Record<AccountStatus, `account.body.${string}`>;

// T3. Where the opening stands, told calmly. Never a deposit instruction here: money only
// moves once the account is open, from the deposit screens (PRD section 5, failure B2).
export function AccountStatusScreen() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const polling = me ? waiting.includes(me.accountStatus) : false;
  const account = useAccount({ poll: polling });

  // The account status moved (polling): refresh the client so routing follows it.
  const status = account.data?.status;
  useEffect(() => {
    if (status && me && status !== me.accountStatus) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    }
  }, [status, me, queryClient]);

  if (account.isError) return <ErrorState onRetry={() => void account.refetch()} />;
  if (!account.data) return <LoadingState />;
  return <AccountStatusView account={account.data} />;
}

function AccountStatusView({ account }: { account: Account }) {
  const { t, i18n } = useTranslation();
  const upload = useUploadDocument();
  const { status } = account;
  const timeline = accountTimeline(status);
  const documents = account.pending.filter((item) => item.kind === "document");

  return (
    <section className="flex flex-col gap-8 pb-6">
      <header className="flex flex-col gap-3">
        <h1 className="type-title text-navy-900">{t(`account.title.${status}`)}</h1>
        <p className="type-body text-gray-600">{t(bodyKey[status])}</p>
      </header>

      {status === "draft" && (
        <Link to={paths.onboarding} className={buttonClass("primary")}>
          {t("account.actions.continue")}
        </Link>
      )}

      {timeline && (
        <Timeline
          label={t("account.timeline.label")}
          locale={asLocale(i18n.language)}
          steps={timeline.map((step) => ({
            id: step.id,
            label: t(step.labelKey),
            status: step.status,
            ...(step.noteKey && { note: t(step.noteKey) }),
          }))}
        />
      )}

      {status === "action_required" &&
        (documents.length > 0 ? (
          <ul
            aria-label={t("account.documents")}
            className="flex flex-col border-t border-gray-200"
          >
            {documents.map((item) => (
              <DocumentUpload
                key={item.id}
                item={item}
                upload={(file, onProgress) =>
                  upload.mutateAsync({ pendingItemId: item.id, file, onProgress })
                }
              />
            ))}
          </ul>
        ) : (
          <p className="type-body border-l-2 border-green-700 py-1 pl-4 text-graphite-900">
            {t("account.allSent")}
          </p>
        ))}

      {status === "open" && (
        <>
          {account.ibkrAccountMasked && (
            <Ledger>
              <LedgerRow label={t("account.accountNumber")}>{account.ibkrAccountMasked}</LedgerRow>
            </Ledger>
          )}
          <Link to={paths.plan} className={buttonClass("primary")}>
            {t("account.actions.createPlan")}
          </Link>
        </>
      )}

      {(status === "rejected" || status === "restricted") && (
        <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("secondary")}>
          {t("account.actions.contact")}
        </a>
      )}

      <p className="type-caption border-t border-gray-200 pt-4 text-gray-600">
        {t("custody.note")}
      </p>
    </section>
  );
}
