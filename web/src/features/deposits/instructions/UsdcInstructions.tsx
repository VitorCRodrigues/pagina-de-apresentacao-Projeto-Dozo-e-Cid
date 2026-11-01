import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DepositDetail, ScopedUsdcInstructions } from "@/api/proposed-types";
import { Banner } from "@/components/Banner";
import { CopyField } from "@/components/CopyField";
import { Icon } from "@/components/Icon";
import { QrCode } from "@/components/QrCode";
import { ExactAmount } from "./ExactAmount";

interface UsdcInstructionsProps {
  deposit: DepositDetail;
  instructions: ScopedUsdcInstructions;
}

// T7, ar_usdc. USDC is only the way the money travels: a bank's tone, no coin imagery
// (decisions.md, item 7). Token and network come from the API and are shown locked.
export function UsdcInstructions({ deposit, instructions }: UsdcInstructionsProps) {
  const { t } = useTranslation("deposit");
  return (
    <div className="flex flex-col gap-6">
      <ExactAmount amountCents={deposit.amountCents} />

      <div className="flex flex-col gap-1.5">
        <span className="type-label text-graphite-900">
          {t("deposit.instructions.usdc.lockedLabel")}
        </span>
        <p className="type-label flex items-center gap-2 rounded-control border-2 border-navy-900 px-3 py-3 text-navy-900">
          <Icon icon={Lock} size={16} className="shrink-0" />
          {t("deposit.instructions.usdc.locked", { network: instructions.network })}
        </p>
      </div>

      <Banner tone="warning" title={t("deposit.instructions.usdc.warning")} />

      {/* The client never types the address: copy or scan only (PRD section 5). */}
      <CopyField label={t("deposit.instructions.usdc.address")} value={instructions.address} />
      {/* Only the address: exchanges in Argentina read URI prefixes differently. */}
      <QrCode value={instructions.address} label={t("deposit.instructions.usdc.qr")} size={176} />

      {instructions.memo && (
        <div className="flex flex-col gap-1.5">
          <CopyField label={t("deposit.instructions.usdc.memo")} value={instructions.memo} />
          <p className="type-caption text-gray-600">{t("deposit.instructions.usdc.memoNote")}</p>
        </div>
      )}

      <Banner tone="info" quiet title={t("deposit.instructions.usdc.usdt")} />
      {deposit.isFirstDeposit && (
        <Banner tone="info" quiet title={t("deposit.instructions.usdc.testSend")} />
      )}
    </div>
  );
}
