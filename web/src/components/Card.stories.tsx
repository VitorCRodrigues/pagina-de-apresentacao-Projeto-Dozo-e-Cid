import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Card } from "./Card";
import { Ledger, LedgerRow } from "./Ledger";
import { Money } from "./Money";

const meta = preview.meta({ title: "Primitives/Card", component: Card });

// A real grouping: one monthly plan and its three facts.
export const Paper = meta.story({
  render: (_args, { globals }) => (
    <Card className="flex flex-col gap-3">
      <h3 className="type-heading text-navy-900">{i18n.t("demo:plan.title")}</h3>
      <Ledger className="border-b-0">
        <LedgerRow label={i18n.t("demo:field.amountLabel")}>
          <Money cents={50000} locale={storyLocale(globals)} />
        </LedgerRow>
        <LedgerRow label={i18n.t("demo:select.label")}>
          {i18n.t("demo:select.day", { day: 5 })}
        </LedgerRow>
        <LedgerRow label={i18n.t("demo:radio.label")}>{i18n.t("demo:radio.usdcTitle")}</LedgerRow>
      </Ledger>
    </Card>
  ),
});

export const Inverse = meta.story({
  render: (_args, { globals }) => (
    <Card tone="inverse" className="flex flex-col gap-1">
      <p className="type-label text-cream-50">{i18n.t("demo:balance.total")}</p>
      <Money
        cents={1248050}
        locale={storyLocale(globals)}
        size="display"
        className="text-gold-500"
      />
    </Card>
  ),
});
