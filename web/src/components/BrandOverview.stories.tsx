import type { ReactNode } from "react";
import type { CostLine, Locale } from "@/api/types";
import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Badge } from "./Badge";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Card, CardRow } from "./Card";
import { Checkbox } from "./Checkbox";
import { CopyField } from "./CopyField";
import { CostTable } from "./CostTable";
import { Countdown } from "./Countdown";
import { Field } from "./Field";
import { Input } from "./Input";
import { Money } from "./Money";
import { EmptyState, ErrorState, LoadingState } from "./PageState";
import { QrCode } from "./QrCode";
import { RadioCard, RadioCardGroup } from "./RadioCard";
import { RiskNote } from "./RiskNote";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";
import { Stepper } from "./Stepper";
import { Timeline } from "./Timeline";

const meta = preview.meta({ title: "Brand overview", parameters: { frame: false } });

const swatches = [
  { token: "navy-900", role: "navy" },
  { token: "green-700", role: "green" },
  { token: "gold-500", role: "gold" },
  { token: "cream-50", role: "cream" },
  { token: "graphite-900", role: "graphite" },
  { token: "gray-600", role: "gray600" },
  { token: "gray-500", role: "gray500" },
  { token: "gray-200", role: "gray200" },
  { token: "amber-700", role: "amber" },
  { token: "brick-700", role: "brick" },
] as const;

const typeStyles = ["display", "title", "heading", "body", "label", "caption"] as const;

const address = "0x52908400098527886E0F7030069857D2E4169EE7";

const costLines: CostLine[] = [
  { kind: "rail_fee", label: "", amountCents: 150, percent: 0.003, estimated: false },
  { kind: "advisory_fee", label: "", amountCents: 250, percent: 0.005, estimated: true },
];

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-[375px] shrink-0 flex-col gap-6">
      <h2 className="type-title border-b border-gray-200 pb-3 text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ token, role }: (typeof swatches)[number]) {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(`--od-${token}`).trim();
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-11 shrink-0 rounded-control border border-gray-200"
        style={{ backgroundColor: `var(--od-${token})` }}
      />
      <div className="flex min-w-0 flex-col">
        <span className="type-label text-graphite-900">
          {token} <span className="type-caption text-gray-600 uppercase">{hex}</span>
        </span>
        <span className="type-caption text-gray-600">{i18n.t(`demo:overview.colors.${role}`)}</span>
      </div>
    </div>
  );
}

function Foundations() {
  return (
    <Column title={i18n.t("demo:overview.palette")}>
      <div className="flex flex-col gap-3">
        {swatches.map((swatch) => (
          <Swatch key={swatch.token} {...swatch} />
        ))}
      </div>
      <h2 className="type-title border-b border-gray-200 pt-4 pb-3 text-navy-900">
        {i18n.t("demo:overview.type")}
      </h2>
      <div className="flex flex-col gap-4">
        {typeStyles.map((style) => (
          <div key={style} className="flex flex-col gap-1">
            <span className="type-caption text-gray-600">
              {i18n.t(`demo:overview.styles.${style}`)}
            </span>
            <p className={`type-${style} text-graphite-900`}>{i18n.t("demo:overview.specimen")}</p>
          </div>
        ))}
      </div>
    </Column>
  );
}

function Primitives() {
  const days = [1, 5, 10, 15].map((day) => ({
    value: String(day),
    label: i18n.t("demo:select.day", { day }),
  }));
  return (
    <Column title={i18n.t("demo:overview.primitives")}>
      <Stepper steps={i18n.t("demo:stepper.steps", { returnObjects: true })} current={3} />
      <div className="flex flex-col gap-3">
        <Button>{i18n.t("demo:button.primary")}</Button>
        <Button variant="key">{i18n.t("demo:button.key")}</Button>
        <Button variant="secondary">{i18n.t("demo:button.secondary")}</Button>
        <Button variant="destructive">{i18n.t("demo:button.destructive")}</Button>
        <Button loading>{i18n.t("demo:button.loading")}</Button>
        <Button variant="ghost" fullWidth="never" className="self-start">
          {i18n.t("demo:button.ghost")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{i18n.t("demo:badge.neutral")}</Badge>
        <Badge tone="info">{i18n.t("demo:badge.info")}</Badge>
        <Badge tone="success">{i18n.t("demo:badge.success")}</Badge>
        <Badge tone="warning">{i18n.t("demo:badge.warning")}</Badge>
        <Badge tone="error">{i18n.t("demo:badge.error")}</Badge>
      </div>
      <Field label={i18n.t("demo:field.amountLabel")} help={i18n.t("demo:field.amountHelp")}>
        <Input leading="US$" inputMode="decimal" defaultValue="250" />
      </Field>
      <Field
        label={i18n.t("demo:field.cuitLabel")}
        help={i18n.t("demo:field.cuitHelp")}
        error={i18n.t("demo:field.cuitError")}
      >
        <Input inputMode="numeric" defaultValue="20123456780" />
      </Field>
      <Field label={i18n.t("demo:select.label")}>
        <Select options={days} defaultValue="5" />
      </Field>
      <RadioCardGroup label={i18n.t("demo:radio.label")} defaultValue="ar_usdc">
        <RadioCard
          value="ar_usdc"
          title={i18n.t("demo:radio.usdcTitle")}
          description={i18n.t("demo:radio.usdcBody")}
          aside={<Badge tone="success">{i18n.t("demo:radio.recommended")}</Badge>}
        />
        <RadioCard
          value="ar_swift"
          title={i18n.t("demo:radio.swiftTitle")}
          description={i18n.t("demo:radio.swiftBody")}
        />
      </RadioCardGroup>
      <Checkbox label={i18n.t("demo:checkbox.terms")} defaultChecked />
      <Banner tone="info" title={i18n.t("demo:banner.infoTitle")}>
        {i18n.t("demo:banner.infoBody")}
      </Banner>
      <Banner tone="warning" title={i18n.t("demo:banner.warningTitle")}>
        {i18n.t("demo:banner.warningBody")}
      </Banner>
      <Banner tone="error" title={i18n.t("demo:banner.errorTitle")}>
        {i18n.t("demo:banner.errorBody")}
      </Banner>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </Column>
  );
}

function Domain({ locale, quoteExpiresAt }: { locale: Locale; quoteExpiresAt: string }) {
  return (
    <Column title={i18n.t("demo:overview.domain")}>
      <Card tone="inverse" className="flex flex-col gap-1">
        <p className="type-label">{i18n.t("demo:balance.total")}</p>
        <Money cents={1248050} locale={locale} size="display" className="text-gold-500" />
      </Card>
      <Card className="py-2">
        <CardRow>
          <span className="type-body">{i18n.t("demo:balance.invested")}</span>
          <Money cents={1190050} locale={locale} className="type-value" />
        </CardRow>
        <CardRow>
          <span className="type-body">{i18n.t("demo:balance.cash")}</span>
          <Money cents={58000} locale={locale} className="type-value" />
        </CardRow>
        <CardRow>
          <span className="type-body">{i18n.t("demo:balance.inFlight")}</span>
          <Money cents={0} locale={locale} className="type-value" />
        </CardRow>
      </Card>
      <RiskNote />
      <Countdown expiresAt={quoteExpiresAt} label={i18n.t("demo:countdown.label")} />
      <CostTable
        lines={costLines}
        amountCents={50000}
        totalCostCents={400}
        netToInvestCents={49600}
        locale={locale}
      />
      <Timeline
        label={i18n.t("demo:timeline.label")}
        locale={locale}
        steps={[
          {
            id: "ibkr",
            label: i18n.t("demo:timeline.ibkr"),
            status: "done",
            at: "2026-10-23T16:42:00Z",
          },
          {
            id: "notified",
            label: i18n.t("demo:timeline.notified"),
            status: "current",
            at: "2026-10-27T12:05:00Z",
            note: i18n.t("demo:timeline.notifiedNote"),
          },
          { id: "collected", label: i18n.t("demo:timeline.usdcReceived"), status: "upcoming" },
          { id: "invested", label: i18n.t("demo:timeline.invested"), status: "upcoming" },
        ]}
      />
      <CopyField label={i18n.t("demo:copy.addressLabel")} value={address} />
      <QrCode value={address} label={i18n.t("demo:qr.label")} size={160} />
    </Column>
  );
}

function States() {
  return (
    <Column title={i18n.t("demo:overview.states")}>
      <div className="-mx-5 border-b border-gray-200">
        <LoadingState />
      </div>
      <div className="-mx-5 border-b border-gray-200">
        <EmptyState
          title={i18n.t("demo:empty.title")}
          body={i18n.t("demo:empty.body")}
          action={<Button>{i18n.t("demo:empty.action")}</Button>}
        />
      </div>
      <div className="-mx-5">
        <ErrorState onRetry={() => undefined} />
      </div>
    </Column>
  );
}

export const Overview = meta.story({
  name: "Brand overview",
  render: (_args, { globals }) => {
    const locale = storyLocale(globals);
    // Inside the last minute, to show the warning state.
    const quoteExpiresAt = new Date(Date.now() + 42_000).toISOString();
    return (
      <main className="flex flex-col gap-10 p-10">
        <header className="flex max-w-2xl flex-col gap-2">
          <h1 className="type-display text-navy-900">{i18n.t("demo:overview.title")}</h1>
          <p className="type-body text-gray-600">{i18n.t("demo:overview.intro")}</p>
        </header>
        <div className="flex items-start gap-12">
          <Foundations />
          <Primitives />
          <Domain locale={locale} quoteExpiresAt={quoteExpiresAt} />
          <States />
        </div>
      </main>
    );
  },
});
