import { useTranslation } from "react-i18next";
import type { DepositDetail, ScopedWireInstructions } from "@/api/proposed-types";
import { Banner } from "@/components/Banner";
import { CopyField } from "@/components/CopyField";
import { ExactAmount } from "./ExactAmount";

interface WireInstructionsProps {
  deposit: DepositDetail;
  instructions: ScopedWireInstructions;
}

// T7, ar_swift. Every field comes from the API; the reference is the one the client must
// not miss, so it gets the navy rule and the word "Obligatoria".
export function WireInstructions({ deposit, instructions }: WireInstructionsProps) {
  const { t } = useTranslation("deposit");
  return (
    <div className="flex flex-col gap-6">
      <ExactAmount amountCents={deposit.amountCents} />

      <div className="flex flex-col gap-2 border-l-2 border-navy-900 pl-4">
        <CopyField
          label={t("deposit.instructions.wire.reference")}
          value={instructions.reference}
        />
        <p className="type-caption text-graphite-900">
          {t("deposit.instructions.wire.referenceNote")}
        </p>
      </div>

      <CopyField
        label={t("deposit.instructions.wire.beneficiary")}
        value={instructions.beneficiaryName}
        mono={false}
      />
      <CopyField
        label={t("deposit.instructions.wire.account")}
        value={instructions.accountNumber}
      />
      <CopyField
        label={t("deposit.instructions.wire.bank")}
        value={instructions.bankName}
        mono={false}
      />
      <CopyField label={t("deposit.instructions.wire.swift")} value={instructions.swiftBic} />

      <Banner tone="warning" title={t("deposit.instructions.wire.ownAccount")} />
      <Banner tone="info" quiet title={t("deposit.instructions.wire.bankFees")} />
    </div>
  );
}
