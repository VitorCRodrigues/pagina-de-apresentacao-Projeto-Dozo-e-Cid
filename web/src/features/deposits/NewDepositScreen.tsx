import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { errorMessageKey } from "@/api/error-messages";
import { isApiError } from "@/api/errors";
import { useConfig } from "@/api/hooks/config";
import { useAccount, useMe } from "@/api/hooks/account";
import { useQuote, type TimedQuote } from "@/api/hooks/deposits";
import { usePlans } from "@/api/hooks/plans";
import type { Account, AppConfig, Locale, Me, Rail, RailOption } from "@/api/types";
import { ActionBar } from "@/components/ActionBar";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { buttonClass } from "@/components/component-styles";
import { CostTable } from "@/components/CostTable";
import { Countdown } from "@/components/Countdown";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Money } from "@/components/Money";
import { ErrorState, LoadingState } from "@/components/PageState";
import { RadioCard, RadioCardGroup } from "@/components/RadioCard";
import { Stepper } from "@/components/Stepper";
import { WaitlistForm } from "@/features/session/WaitlistForm";
import { asLocale } from "@/lib/locale";
import { centsToInputText, currencySymbol, formatMoney, formatPercent } from "@/lib/money";
import { SUPPORT_EMAIL } from "@/lib/support";
import { paths } from "@/routes";
import { blockMessageKeys } from "@/api/error-messages";
import {
  accountBlock,
  amountSchema,
  isQuoteExpired,
  visibleOptions,
  type AmountError,
} from "./rules";
import { useConfirmDeposit } from "./useConfirmDeposit";

const steps = ["amount", "rail", "preview"] as const;
type Step = (typeof steps)[number];

// Each step is its own history entry with the step in history.state, so the browser's and
// Android's Back walk the steps. Nothing about the amount goes into the URL or the state.
function readStep(state: unknown): Step {
  const step = (state as { depositStep?: unknown } | null)?.depositStep;
  return steps.includes(step as Step) ? (step as Step) : "amount";
}

// The monthly plan's reminder opens T6 as ?plan=<id> (decision D9). Only the id travels in the
// URL; the amount comes from GET /plans. Read once, then the query leaves the address bar.
function usePlanFromQuery(): { plan: PlanStart | null; loading: boolean } {
  const location = useLocation();
  const navigate = useNavigate();
  const [planId] = useState(() => new URLSearchParams(location.search).get("plan"));
  const plans = usePlans({ enabled: planId !== null });
  const hasQuery = location.search !== "";
  const state: unknown = location.state;
  useEffect(() => {
    if (hasQuery) void navigate(location.pathname, { replace: true, state });
  }, [hasQuery, navigate, location.pathname, state]);

  if (!planId) return { plan: null, loading: false };
  // A failed plans request is no reason to block a deposit: it starts empty.
  if (plans.isPending) return { plan: null, loading: true };
  const found = plans.data?.find((p) => p.id === planId && p.status !== "cancelled");
  return { plan: found ? { id: found.id, amountCents: found.amountCents } : null, loading: false };
}

interface PlanStart {
  id: string;
  amountCents: number;
}

// T6. Loads what the flow needs, then either the block or the flow.
export function NewDepositScreen() {
  const { data: me } = useMe();
  const config = useConfig();
  const account = useAccount();
  const fromPlan = usePlanFromQuery();

  if (config.isError || account.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void config.refetch();
          void account.refetch();
        }}
      />
    );
  }
  if (!me || !config.data || !account.data || fromPlan.loading) return <LoadingState />;
  return <DepositFlow me={me} config={config.data} account={account.data} plan={fromPlan.plan} />;
}

function BlockNotice({ me, account }: { me: Me; account: Account }) {
  const { t } = useTranslation("deposit");
  const block = accountBlock(account);
  if (!block) return null;
  const { message } = blockMessageKeys(block.reason);

  return (
    <section className="flex flex-col gap-6 py-2">
      <h1 className="type-title text-navy-900">{t("deposit.title")}</h1>
      <Banner tone="warning" title={t(message)} />
      {block.action === "followUp" && (
        <Link to={paths.accountStatus} className={buttonClass("secondary")}>
          {t("deposit.actions.followUp")}
        </Link>
      )}
      {block.action === "support" && (
        <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass("secondary")}>
          {t("deposit.actions.support")}
        </a>
      )}
      {block.action === "waitlist" && <WaitlistForm defaultEmail={me.email} country={me.country} />}
    </section>
  );
}

interface DepositFlowProps {
  me: Me;
  config: AppConfig;
  account: Account;
  plan: PlanStart | null;
}

function DepositFlow({ me, config, account, plan }: DepositFlowProps) {
  const { t, i18n } = useTranslation("deposit");
  const locale = asLocale(i18n.language);
  const location = useLocation();
  const navigate = useNavigate();
  const quoteRequest = useQuote();

  const [amountCents, setAmountCents] = useState<number | null>(plan?.amountCents ?? null);
  const [timed, setTimed] = useState<TimedQuote | null>(null);
  const [rail, setRail] = useState<Rail | null>(null);
  const [expiredQuoteId, setExpiredQuoteId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<unknown>(null);

  // Without a quote in memory (reload, a deep link), only the first step makes sense, and a
  // step left in this history entry is cleared so Back keeps the steps in order.
  const step: Step = timed ? readStep(location.state) : "amount";
  const staleStep = !timed && readStep(location.state) !== "amount";
  useEffect(() => {
    if (staleStep) void navigate(location.pathname, { replace: true, state: null });
  }, [staleStep, navigate, location.pathname]);
  const go = (next: Step) => {
    void navigate(location.pathname, { state: { depositStep: next } });
  };

  const options = useMemo(
    () => (timed ? visibleOptions(timed.quote.options, config) : []),
    [timed, config],
  );
  const chosen = options.find((option) => option.rail === rail) ?? null;
  const quote = timed?.quote ?? null;
  const confirmation = useConfirmDeposit(quote, chosen?.rail ?? null);

  async function requestQuote(cents: number): Promise<boolean> {
    try {
      const next = await quoteRequest.mutateAsync({
        amountCents: cents,
        ...(plan && { planId: plan.id }),
      });
      const visible = visibleOptions(next.quote.options, config);
      setTimed(next);
      // Keep the chosen rail when the new quote still offers it. If it is gone, never swap it
      // silently on the preview: back to the rail step, with the recommended one marked.
      if (!visible.some((o) => o.rail === rail)) {
        setRail((visible.find((o) => o.recommended) ?? visible[0])?.rail ?? null);
        if (step === "preview") {
          void navigate(location.pathname, { replace: true, state: { depositStep: "rail" } });
        }
      }
      return true;
    } catch {
      return false; // quoteRequest.error drives the note
    }
  }

  async function confirm() {
    if (!quote || !timed) return;
    // The countdown ticks once a second; check the server clock again at the click.
    if (isQuoteExpired(quote, Date.now() + timed.clockOffsetMs)) {
      setExpiredQuoteId(quote.id);
      return;
    }
    setConfirmError(null);
    const outcome = await confirmation.confirm();
    if (!outcome) return;
    if ("deposit" in outcome) {
      void navigate(paths.depositDetail(outcome.deposit.id), { replace: true });
    } else if (isApiError(outcome.error) && outcome.error.code === "quote_expired") {
      // The server has the final word on expiry, whatever the countdown says.
      setExpiredQuoteId(quote.id);
    } else {
      setConfirmError(outcome.error);
    }
  }

  // Expiry belongs to one quote: a new quote starts clean.
  const expired = quote !== null && expiredQuoteId === quote.id;

  if (accountBlock(account)) return <BlockNotice me={me} account={account} />;

  const stepLabels = steps.map((s) => t(`deposit.steps.${s}`));

  return (
    <div className="flex flex-col gap-8 pb-24">
      <Stepper steps={stepLabels} current={steps.indexOf(step)} />
      {step === "amount" && (
        <AmountStep
          config={config}
          locale={locale}
          defaultCents={amountCents}
          pending={quoteRequest.isPending}
          error={quoteRequest.error}
          onBack={() => void navigate(paths.deposit)}
          onSubmit={async (cents) => {
            setAmountCents(cents);
            if (await requestQuote(cents)) go("rail");
          }}
        />
      )}
      {step === "rail" && (
        <RailStep
          options={options}
          rail={rail}
          locale={locale}
          onChange={setRail}
          onBack={() => void navigate(-1)}
          onNext={() => {
            go("preview");
          }}
        />
      )}
      {step === "preview" && quote && chosen && timed && (
        <PreviewStep
          option={chosen}
          amountCents={quote.amountCents}
          expiresAt={quote.expiresAt}
          clockOffsetMs={timed.clockOffsetMs}
          locale={locale}
          expired={expired}
          renewing={quoteRequest.isPending}
          confirming={confirmation.pending}
          error={confirmError ?? quoteRequest.error}
          onExpire={() => {
            setExpiredQuoteId(quote.id);
          }}
          onRenew={() => {
            setConfirmError(null);
            void requestQuote(quote.amountCents);
          }}
          onBack={() => void navigate(-1)}
          onConfirm={() => void confirm()}
        />
      )}
    </div>
  );
}

interface AmountStepProps {
  config: AppConfig;
  locale: Locale;
  defaultCents: number | null;
  pending: boolean;
  error: unknown;
  onBack: () => void;
  onSubmit: (amountCents: number) => Promise<void>;
}

function AmountStep({
  config,
  locale,
  defaultCents,
  pending,
  error,
  onBack,
  onSubmit,
}: AmountStepProps) {
  const { t } = useTranslation("deposit");
  const formId = useId();
  const schema = useMemo(() => amountSchema(config, locale), [config, locale]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      // The client's own digits, as they typed them (no currency symbol in the field).
      amount: defaultCents === null ? "" : centsToInputText(defaultCents, locale),
    },
  });
  const min = formatMoney(config.minDepositUsdCents, locale);
  const code = form.formState.errors.amount?.message as AmountError | undefined;
  const submit = form.handleSubmit(({ amountCents }) => onSubmit(amountCents));

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6"
    >
      <h1 className="type-title text-navy-900">{t("deposit.amount.title")}</h1>
      <Field
        label={t("deposit.amount.label")}
        // The error already states the minimum: the help steps aside.
        {...(!code && { help: t("deposit.amount.help", { min }) })}
        error={code ? t(`deposit.amount.${code}`, { min }) : undefined}
      >
        <Input
          variant="amount"
          leading={currencySymbol(locale)}
          inputMode="decimal"
          autoComplete="off"
          {...form.register("amount")}
        />
      </Field>
      {error != null && <Banner tone="error" title={t(errorMessageKey(error))} />}
      <ActionBar>
        <Button variant="ghost" fullWidth="never" onClick={onBack} disabled={pending}>
          {t("deposit.actions.back")}
        </Button>
        <Button type="submit" form={formId} loading={pending} fullWidth="never" className="flex-1">
          {t("deposit.actions.continue")}
        </Button>
      </ActionBar>
    </form>
  );
}

interface RailStepProps {
  options: RailOption[];
  rail: Rail | null;
  locale: Locale;
  onChange: (rail: Rail) => void;
  onBack: () => void;
  onNext: () => void;
}

function RailStep({ options, rail, locale, onChange, onBack, onNext }: RailStepProps) {
  const { t } = useTranslation("deposit");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="type-title text-navy-900">{t("deposit.rail.title")}</h1>
      <RadioCardGroup
        label={t("deposit.rail.label")}
        value={rail ?? ""}
        onValueChange={(value) => {
          onChange(value as Rail);
        }}
      >
        {options.map((option) => (
          <RadioCard
            key={option.rail}
            value={option.rail}
            title={t(`deposit.rail.names.${option.rail}`)}
            description={t("deposit.rail.summary", {
              cost: formatMoney(option.totalCostCents, locale),
              percent: formatPercent(
                option.netToInvestCents + option.totalCostCents > 0
                  ? option.totalCostCents / (option.netToInvestCents + option.totalCostCents)
                  : 0,
                locale,
              ),
              days: t("deposit.rail.days", {
                min: option.expectedDays.min,
                count: option.expectedDays.max,
              }),
            })}
            {...(option.recommended && { recommendation: t("deposit.rail.recommended") })}
          />
        ))}
      </RadioCardGroup>
      <ActionBar>
        <Button variant="ghost" fullWidth="never" onClick={onBack}>
          {t("deposit.actions.back")}
        </Button>
        <Button fullWidth="never" className="flex-1" disabled={!rail} onClick={onNext}>
          {t("deposit.actions.continue")}
        </Button>
      </ActionBar>
    </div>
  );
}

interface PreviewStepProps {
  option: RailOption;
  amountCents: number;
  expiresAt: string;
  clockOffsetMs: number;
  locale: Locale;
  expired: boolean;
  renewing: boolean;
  confirming: boolean;
  error: unknown;
  onExpire: () => void;
  onRenew: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

// The cost preview is the only place a deposit can be confirmed (PRD section 5).
function PreviewStep({
  option,
  amountCents,
  expiresAt,
  clockOffsetMs,
  locale,
  expired,
  renewing,
  confirming,
  error,
  onExpire,
  onRenew,
  onBack,
  onConfirm,
}: PreviewStepProps) {
  const { t } = useTranslation("deposit");
  // The countdown runs on the server's clock, as estimated from the quote's Date header.
  const serverNow = useCallback(() => Date.now() + clockOffsetMs, [clockOffsetMs]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="type-title text-navy-900">{t("deposit.preview.title")}</h1>
        <p className="type-body text-gray-600">
          {t("deposit.preview.lead", { amount: formatMoney(amountCents, locale) })}
        </p>
      </header>

      <CostTable
        lines={option.costs}
        amountCents={amountCents}
        totalCostCents={option.totalCostCents}
        netToInvestCents={option.netToInvestCents}
        locale={locale}
        netRow={false}
      />

      {/* The one headline figure of the screen, apart from the table: Fraunces has no
          tabular figures, so it never sits in a column. */}
      <div className="flex flex-col gap-1 border-t-[3px] border-double border-graphite-900 pt-4">
        <span className="type-label text-navy-900">{t("deposit.preview.net")}</span>
        <Money
          cents={option.netToInvestCents}
          locale={locale}
          size="display"
          className="text-navy-900"
        />
      </div>

      {expired ? (
        <Banner
          tone="warning"
          title={t("deposit.preview.expired")}
          action={
            <Button variant="secondary" loading={renewing} onClick={onRenew}>
              {t("deposit.preview.newQuote")}
            </Button>
          }
        >
          {t("deposit.preview.expiredBody")}
        </Banner>
      ) : (
        <Countdown
          key={expiresAt}
          expiresAt={expiresAt}
          label={t("deposit.preview.countdown")}
          now={serverNow}
          onExpire={onExpire}
        />
      )}

      {error != null && <Banner tone="error" title={t(errorMessageKey(error))} />}
      <p className="type-caption text-gray-600">{t("deposit.preview.next")}</p>

      <ActionBar>
        <Button variant="ghost" fullWidth="never" onClick={onBack} disabled={confirming}>
          {t("deposit.actions.back")}
        </Button>
        <Button
          fullWidth="never"
          className="flex-1"
          disabled={expired}
          loading={confirming}
          onClick={onConfirm}
        >
          {t("deposit.preview.confirm")}
        </Button>
      </ActionBar>
    </div>
  );
}
