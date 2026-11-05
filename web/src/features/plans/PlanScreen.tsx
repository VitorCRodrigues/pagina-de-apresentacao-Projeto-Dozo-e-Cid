import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount, useMe } from "@/api/hooks/account";
import { useConfig } from "@/api/hooks/config";
import { usePlans } from "@/api/hooks/plans";
import type { CreatePlanRequest } from "@/api/proposed-types";
import { Banner } from "@/components/Banner";
import { ErrorState, LoadingState } from "@/components/PageState";
import { RiskNote } from "@/components/RiskNote";
import { accountBlock } from "@/features/deposits/rules";
import { cx } from "@/lib/cx";
import { asLocale } from "@/lib/locale";
import { currentPlan, planRails } from "./plan-rules";
import { PlanForm } from "./PlanForm";
import { PlanReview } from "./PlanReview";
import { PlanSummary } from "./PlanSummary";
import { AccountBlockNote } from "@/features/account/AccountBlockNote";

// Form and preview live in component state, never in the URL (no amount in a link).
type Mode =
  | { step: "view" }
  // `draft`: what the client typed, kept when they come back from the preview.
  | { step: "form"; draft?: CreatePlanRequest }
  | { step: "review"; draft: CreatePlanRequest };

// T5. Creates, edits, pauses, resumes and cancels the monthly plan through POST and PATCH /plans.
// TODO(decisão): the backend does not schedule recurrences yet (PRD T5); the plan is saved and
// its monthly reminder ("Hora de tu aporte") is a notification that opens T6 with ?plan=<id>.
export function PlanScreen() {
  const { t, i18n } = useTranslation("plan");
  const locale = asLocale(i18n.language);
  const plans = usePlans();
  const account = useAccount();
  const config = useConfig();
  const me = useMe();
  const [mode, setMode] = useState<Mode>({ step: "view" });
  const rails = useMemo(
    () => (config.data && me.data ? planRails(config.data, me.data.country) : []),
    [config.data, me.data],
  );

  const failed = [plans, account, config, me].find((query) => query.isError);
  // What the step around the body shows. Instructions only where there is something to choose;
  // the risk note wherever a plan or its costs are on screen (PRD section 10).
  let body;
  let title = t("plan.title");
  let instructions = false;
  let explainsWindow = false;
  let riskNote = false;
  let actionBar = false;
  if (failed) {
    body = <ErrorState onRetry={() => void failed.refetch()} />;
  } else if (!plans.data || !account.data || !config.data || !me.data) {
    body = <LoadingState />;
  } else {
    const plan = currentPlan(plans.data);
    const block = accountBlock(account.data);
    const hadCancelled = !plan && plans.data.some((p) => p.status === "cancelled");
    const toView = () => {
      setMode({ step: "view" });
    };
    riskNote = true;

    if (block) {
      body = (
        <>
          <AccountBlockNote account={account.data} />
          {plan && <PlanSummary plan={plan} locale={locale} readOnly onEdit={toView} />}
        </>
      );
    } else if (rails.length === 0) {
      body = <Banner tone="warning" title={t("plan.noRails")} />;
    } else if (mode.step === "review") {
      title = t("plan.review.title");
      actionBar = true;
      body = (
        <PlanReview
          draft={mode.draft}
          {...(plan && { planId: plan.id })}
          locale={locale}
          onBack={() => {
            setMode({ step: "form", draft: mode.draft });
          }}
          onSaved={toView}
        />
      );
    } else if (plan && mode.step === "view") {
      explainsWindow = true;
      body = (
        <PlanSummary
          plan={plan}
          locale={locale}
          readOnly={false}
          onEdit={() => {
            setMode({ step: "form" });
          }}
        />
      );
    } else {
      instructions = true;
      actionBar = true;
      body = (
        <>
          {hadCancelled && <Banner title={t("plan.cancelled")} quiet />}
          <PlanForm
            config={config.data}
            rails={rails}
            locale={locale}
            initial={(mode.step === "form" ? mode.draft : undefined) ?? plan ?? null}
            {...(plan && { onBack: toView })}
            onSubmit={(draft) => {
              setMode({ step: "review", draft });
            }}
          />
        </>
      );
    }
  }

  return (
    // pb-24 on the whole screen: nothing, the risk note included, ends behind the ActionBar.
    <section className={cx("flex flex-col gap-8 py-2", actionBar && "pb-24")}>
      <header className="flex flex-col gap-3">
        <h1 className="type-title text-navy-900">{title}</h1>
        {instructions && (
          <p className="type-body max-w-prose text-gray-600">
            {t("plan.intro")} {t("plan.window")}
          </p>
        )}
      </header>
      {body}
      {explainsWindow && (
        <p className="type-caption max-w-prose text-gray-600">{t("plan.window")}</p>
      )}
      {riskNote && <RiskNote />}
    </section>
  );
}
