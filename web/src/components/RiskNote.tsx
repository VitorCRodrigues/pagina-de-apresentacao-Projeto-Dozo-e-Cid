import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

// Standard risk notice for portfolio and plan screens (PRD section 10).
// TODO(compliance): wording pending legal review.
export function RiskNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={cx("type-caption flex items-start gap-2 text-gray-600", className)}>
      <Icon icon={Info} size={16} className="mt-px shrink-0" />
      {t("risk.default")}
    </p>
  );
}
