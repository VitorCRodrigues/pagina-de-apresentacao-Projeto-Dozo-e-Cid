import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Card, CardRow } from "./Card";
import { Money } from "./Money";

const meta = preview.meta({ title: "Primitives/Card", component: Card });

export const Paper = meta.story({
  render: (_args, { globals }) => {
    const locale = storyLocale(globals);
    return (
      <Card>
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
    );
  },
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
