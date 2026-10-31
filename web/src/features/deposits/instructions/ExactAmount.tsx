import { useTranslation } from "react-i18next";
import { CopyField } from "@/components/CopyField";
import { centsToDecimalString } from "@/lib/money";

// The amount to send, exactly, as a plain decimal ("500.00") that pastes into any exchange
// or bank form. Set apart with a navy rule: it is what the client must get right.
export function ExactAmount({ amountCents }: { amountCents: number }) {
  const { t } = useTranslation("deposit");
  return (
    <div className="flex flex-col gap-2 border-l-2 border-navy-900 pl-4">
      <CopyField
        label={t("deposit.instructions.exactAmount")}
        value={centsToDecimalString(amountCents)}
        mono={false}
      />
      {/* TODO(compliance): wording of the consequences of a different amount. */}
      <p className="type-caption text-graphite-900">{t("deposit.instructions.exactAmountNote")}</p>
    </div>
  );
}
