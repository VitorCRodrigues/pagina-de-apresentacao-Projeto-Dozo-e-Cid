import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";

interface WizardFooterProps {
  formId: string;
  primaryLabel?: string;
  onBack?: (() => void) | undefined;
  pending: boolean;
}

// Fixed to the bottom of the viewport, inside the 480 px column: the one primary action stays
// in reach of the thumb. A hairline above it, like the foot of a statement page.
export function WizardFooter({ formId, primaryLabel, onBack, pending }: WizardFooterProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-cream-50 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <div className="mx-auto flex max-w-[480px] items-center gap-4 px-5 py-3">
        {onBack && (
          <Button variant="ghost" fullWidth="never" onClick={onBack} disabled={pending}>
            {t("onboarding.actions.back")}
          </Button>
        )}
        <Button type="submit" form={formId} loading={pending} fullWidth="never" className="flex-1">
          {primaryLabel ?? t("onboarding.actions.continue")}
        </Button>
      </div>
    </div>
  );
}
