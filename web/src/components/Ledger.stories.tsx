import i18n from "@/i18n";
import preview from "../../.storybook/preview";
import { storyLocale } from "../../.storybook/locale";
import { Ledger, LedgerRow } from "./Ledger";
import { Money } from "./Money";

const meta = preview.meta({ title: "Primitives/Ledger" });

export const Balances = meta.story({
  render: (_args, { globals }) => {
    const locale = storyLocale(globals);
    return (
      <Ledger>
        <LedgerRow label={i18n.t("demo:balance.invested")}>
          <Money cents={1190050} locale={locale} />
        </LedgerRow>
        <LedgerRow label={i18n.t("demo:balance.cash")}>
          <Money cents={58000} locale={locale} />
        </LedgerRow>
        <LedgerRow label={i18n.t("demo:balance.inFlight")}>
          <Money cents={0} locale={locale} />
        </LedgerRow>
      </Ledger>
    );
  },
});
