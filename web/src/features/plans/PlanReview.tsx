import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApi } from "@/api/api-context";
import { createQuote } from "@/api/endpoints";
import { errorMessageKey } from "@/api/error-messages";
import { useCreatePlan, useUpdatePlan } from "@/api/hooks/plans";
import { useIdempotencyKey } from "@/api/idempotency";
import type { CreatePlanRequest } from "@/api/proposed-types";
import { queryKeys } from "@/api/query-keys";
import type { Locale } from "@/api/types";
import { ActionBar } from "@/components/ActionBar";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { CostTable } from "@/components/CostTable";
import { Ledger, LedgerRow } from "@/components/Ledger";
import { InlineError } from "@/components/PageState";
import { Skeleton } from "@/components/Skeleton";
import { formatMoney } from "@/lib/money";

interface PlanReviewProps {
  draft: CreatePlanRequest;
  // Set when editing an existing plan: saves with PATCH instead of POST.
  planId?: string;
  locale: Locale;
  onBack: () => void;
  onSaved: () => void;
}

// T5 preview: the estimated costs of one monthly deposit, from a quote for that amount
// (decision D1). The plan can only be saved from here, with the table on screen.
export function PlanReview({ draft, planId, locale, onBack, onSaved }: PlanReviewProps) {
  const { t } = useTranslation("plan");
  const { t: td } = useTranslation("deposit");
  const api = useApi();
  // A quote is only an estimate here: its expiry does not block saving a plan.
  const quote = useQuery({
    queryKey: queryKeys.planQuote(draft.amountCents, planId),
    queryFn: () => createQuote(api, { amountCents: draft.amountCents, ...(planId && { planId }) }),
    staleTime: 60_000,
    retry: false,
  });
  const option = quote.data?.options.find((o) => o.rail === draft.rail);

  const create = useCreatePlan();
  const update = useUpdatePlan();
  // One key per intention: the same plan resent after a double click or a timeout.
  const idempotency = useIdempotencyKey(draft);
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const save = () => {
    if (saving) return;
    const done = {
      onSuccess: () => {
        idempotency.reset();
        onSaved();
      },
    };
    if (planId) update.mutate({ id: planId, body: draft }, done);
    else create.mutate({ body: draft, idempotencyKey: idempotency.key }, done);
  };

  return (
    <div className="flex flex-col gap-6">
      <Ledger>
        <LedgerRow label={t("plan.summary.amount")}>
          {formatMoney(draft.amountCents, locale)}
        </LedgerRow>
        <LedgerRow label={t("plan.summary.day")}>
          <span className="type-body">{t("plan.summary.dayValue", { day: draft.dayOfMonth })}</span>
        </LedgerRow>
        <LedgerRow label={t("plan.summary.rail")}>
          <span className="type-body whitespace-nowrap">
            {td(`deposit.rail.names.${draft.rail}`)}
          </span>
        </LedgerRow>
      </Ledger>

      {quote.isError ? (
        <InlineError onRetry={() => void quote.refetch()} />
      ) : !quote.data ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{t("common.loading")}</span>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : option ? (
        <div className="flex flex-col gap-2">
          <CostTable
            lines={option.costs}
            amountCents={draft.amountCents}
            totalCostCents={option.totalCostCents}
            netToInvestCents={option.netToInvestCents}
            locale={locale}
            caption={t("plan.review.costs")}
          />
          <p className="type-caption text-gray-600">{t("plan.review.estimated")}</p>
        </div>
      ) : (
        <Banner tone="warning" title={t("plan.review.unavailable")} />
      )}

      {saveError != null && <Banner tone="error" title={t(errorMessageKey(saveError))} />}

      <ActionBar>
        <Button variant="ghost" fullWidth="never" onClick={onBack} disabled={saving}>
          {t("plan.review.back")}
        </Button>
        <Button
          fullWidth="never"
          className="flex-1"
          // Never saved without the cost preview on screen (PRD section 5).
          disabled={!option}
          loading={saving}
          onClick={save}
        >
          {planId ? t("plan.review.saveChanges") : t("plan.review.save")}
        </Button>
      </ActionBar>
    </div>
  );
}
