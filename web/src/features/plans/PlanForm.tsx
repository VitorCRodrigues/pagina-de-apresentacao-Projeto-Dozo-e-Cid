import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CreatePlanRequest } from "@/api/proposed-types";
import type { AppConfig, Locale, Rail } from "@/api/types";
import { ActionBar } from "@/components/ActionBar";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { RadioCard, RadioCardGroup } from "@/components/RadioCard";
import { Select } from "@/components/Select";
import { centsToInputText, currencySymbol, formatMoney } from "@/lib/money";
import { type PlanFormError, planFormSchema } from "./plan-rules";

const DAYS = Array.from({ length: 28 }, (_, index) => index + 1);

interface PlanFormProps {
  config: AppConfig;
  rails: readonly Rail[];
  locale: Locale;
  initial: CreatePlanRequest | null;
  // Editing: "Volver" goes back to the plan; creating has nowhere to go back to.
  onBack?: () => void;
  onSubmit: (plan: CreatePlanRequest) => void;
}

// T5 form: amount (monthly minimum), day 1–28 and rail. Its one action leads to the cost preview.
export function PlanForm({ config, rails, locale, initial, onBack, onSubmit }: PlanFormProps) {
  const { t } = useTranslation("plan");
  const { t: td } = useTranslation("deposit");
  const formId = useId();
  const schema = useMemo(() => planFormSchema(config, locale, rails), [config, locale, rails]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: initial ? centsToInputText(initial.amountCents, locale) : "",
      // The window's own day by default, when it exists in every month.
      dayOfMonth: initial?.dayOfMonth ?? Math.min(config.investmentWindowDay, 28),
      rail: initial?.rail ?? rails[0] ?? "",
    },
  });
  const min = formatMoney(config.minRecurringUsdCents, locale);
  const error = (name: "amount" | "dayOfMonth" | "rail") => {
    const code = form.formState.errors[name]?.message as PlanFormError | undefined;
    return code ? t(`plan.form.errors.${code}`, { min }) : undefined;
  };
  const amountError = error("amount");
  const submit = form.handleSubmit((plan) => {
    onSubmit(plan);
  });

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6 pb-24"
    >
      <Field
        label={t("plan.form.amount")}
        // The error already states the minimum and why: the help steps aside.
        {...(!amountError && { help: t("plan.form.amountHelp", { min }) })}
        error={amountError}
      >
        <Input
          variant="amount"
          leading={currencySymbol(locale)}
          inputMode="decimal"
          autoComplete="off"
          {...form.register("amount")}
        />
      </Field>

      <Controller
        control={form.control}
        name="dayOfMonth"
        render={({ field }) => (
          <Field
            label={t("plan.form.day")}
            help={t("plan.form.dayHelp")}
            error={error("dayOfMonth")}
          >
            <Select
              value={String(field.value)}
              onValueChange={(value) => {
                field.onChange(Number(value));
              }}
              options={DAYS.map((day) => ({
                value: String(day),
                label: t("plan.form.dayOption", { day }),
              }))}
            />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="rail"
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <RadioCardGroup
              label={t("plan.form.rail")}
              value={String(field.value)}
              onValueChange={field.onChange}
            >
              {rails.map((rail) => (
                <RadioCard key={rail} value={rail} title={td(`deposit.rail.names.${rail}`)} />
              ))}
            </RadioCardGroup>
            {error("rail") && <p className="type-caption text-brick-700">{error("rail")}</p>}
          </div>
        )}
      />

      <ActionBar>
        {onBack && (
          <Button variant="ghost" fullWidth="never" onClick={onBack}>
            {t("plan.review.back")}
          </Button>
        )}
        <Button type="submit" form={formId} fullWidth="never" className="flex-1">
          {t("plan.form.continue")}
        </Button>
      </ActionBar>
    </form>
  );
}
