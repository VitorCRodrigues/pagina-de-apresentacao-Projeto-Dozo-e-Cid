import { useTranslation } from "react-i18next";
import { ActionBar } from "@/components/ActionBar";
import { Button } from "@/components/Button";

interface WizardFooterProps {
  formId: string;
  primaryLabel?: string;
  onBack?: (() => void) | undefined;
  pending: boolean;
}

// The assistant's footer: Volver and the step's one primary action, in the fixed ActionBar.
export function WizardFooter({ formId, primaryLabel, onBack, pending }: WizardFooterProps) {
  const { t } = useTranslation("onboarding");
  return (
    <ActionBar>
      {onBack && (
        <Button variant="ghost" fullWidth="never" onClick={onBack} disabled={pending}>
          {t("onboarding.actions.back")}
        </Button>
      )}
      <Button type="submit" form={formId} loading={pending} fullWidth="never" className="flex-1">
        {primaryLabel ?? t("onboarding.actions.continue")}
      </Button>
    </ActionBar>
  );
}
