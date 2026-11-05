import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/api/error-messages";
import { useUpdatePlan } from "@/api/hooks/plans";
import type { Locale, Plan } from "@/api/types";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { Ledger, LedgerRow } from "@/components/Ledger";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { nextStatus, type PlanAction, planActions } from "./plan-rules";

interface PlanSummaryProps {
  plan: Plan;
  locale: Locale;
  // A blocked account sees its plan but cannot change it (decision 14).
  readOnly: boolean;
  onEdit: () => void;
}

// The plan as a statement, then what can be done with it. Pause and resume need no confirmation;
// cancelling does. Resuming is the primary action of a paused plan; an active one has none.
export function PlanSummary({ plan, locale, readOnly, onEdit }: PlanSummaryProps) {
  const { t } = useTranslation("plan");
  const { t: td } = useTranslation("deposit");
  const update = useUpdatePlan();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const actions = readOnly ? [] : planActions(plan.status);

  const move = (action: PlanAction, onSuccess?: () => void) => {
    const status = nextStatus(plan.status, action);
    if (status && status !== plan.status) {
      update.mutate({ id: plan.id, body: { status } }, { ...(onSuccess && { onSuccess }) });
    }
  };
  const closeDialog = (open: boolean) => {
    setConfirmCancel(open);
    if (!open) update.reset();
  };
  const errorBanner = update.error != null && (
    <Banner tone="error" title={t(errorMessageKey(update.error))} />
  );

  return (
    <div className="flex flex-col gap-6">
      {plan.status === "paused" && <Banner title={t("plan.paused")} quiet />}
      {/* One focus: how much goes in each month. The display size is for the total alone. */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="type-label text-gray-600">{t("plan.summary.amount")}</p>
          <p className="type-value-lg text-graphite-900">{formatMoney(plan.amountCents, locale)}</p>
        </div>
        {plan.status !== "cancelled" && (
          <p className="type-label text-gray-600">{t(`plan.summary.statuses.${plan.status}`)}</p>
        )}
      </div>
      <Ledger>
        <LedgerRow label={t("plan.summary.day")}>
          <span className="type-body">{t("plan.summary.dayValue", { day: plan.dayOfMonth })}</span>
        </LedgerRow>
        <LedgerRow label={t("plan.summary.rail")}>
          <span className="type-body whitespace-nowrap">
            {td(`deposit.rail.names.${plan.rail}`)}
          </span>
        </LedgerRow>
        {plan.status === "active" && plan.nextRunAt && (
          <LedgerRow label={t("plan.summary.next")}>
            <span className="type-body tabular-nums">{formatDate(plan.nextRunAt, locale)}</span>
          </LedgerRow>
        )}
      </Ledger>

      {!confirmCancel && errorBanner}

      {actions.length > 0 && (
        <div className="flex flex-col items-start gap-3">
          {actions.includes("resume") && (
            <Button
              loading={update.isPending}
              onClick={() => {
                move("resume");
              }}
            >
              {t("plan.actions.resume")}
            </Button>
          )}
          {actions.includes("edit") && (
            <Button variant="secondary" disabled={update.isPending} onClick={onEdit}>
              {t("plan.actions.edit")}
            </Button>
          )}
          {actions.includes("pause") && (
            <Button
              variant="ghost"
              fullWidth="never"
              className="-ml-1"
              disabled={update.isPending}
              onClick={() => {
                move("pause");
              }}
            >
              {t("plan.actions.pause")}
            </Button>
          )}
          {/* Destructive, so last and set apart: not beside a link of another height (D9). */}
          {actions.includes("cancel") && (
            <Button
              variant="destructive-outline"
              fullWidth="never"
              className="mt-3"
              disabled={update.isPending}
              onClick={() => {
                setConfirmCancel(true);
              }}
            >
              {t("plan.actions.cancel")}
            </Button>
          )}
        </div>
      )}

      {/* Stays open until the cancel is saved, so a slow or failed PATCH is visible here. */}
      <Dialog
        open={confirmCancel}
        onOpenChange={closeDialog}
        title={t("plan.cancelDialog.title")}
        description={t("plan.cancelDialog.body")}
        footer={
          <>
            <Button
              variant="destructive"
              loading={update.isPending}
              onClick={() => {
                move("cancel", () => {
                  closeDialog(false);
                });
              }}
            >
              {t("plan.cancelDialog.confirm")}
            </Button>
            <Button
              variant="ghost"
              disabled={update.isPending}
              onClick={() => {
                closeDialog(false);
              }}
            >
              {t("plan.cancelDialog.back")}
            </Button>
          </>
        }
      >
        {errorBanner}
      </Dialog>
    </div>
  );
}
